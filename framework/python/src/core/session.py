# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Track testing status."""
import copy
import datetime
import pytz
import json
import os
from fastapi.encoders import jsonable_encoder
from common import util, logger, mqtt
from common.risk_profile import RiskProfile
from common.statuses import TestrunStatus, TestResult
from net_orc.ip_control import IPControl

# Certificate dependencies
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.backends import default_backend

NETWORK_KEY = 'network'
DEVICE_INTF_KEY = 'device_intf'
INTERNET_INTF_KEY = 'internet_intf'
MONITOR_PERIOD_KEY = 'monitor_period'
STARTUP_TIMEOUT_KEY = 'startup_timeout'
LOG_LEVEL_KEY = 'log_level'
API_URL_KEY = 'api_url'
API_PORT_KEY = 'api_port'
MAX_DEVICE_REPORTS_KEY = 'max_device_reports'
ORG_NAME_KEY = 'org_name'
CERTS_PATH = 'local/root_certs'
CONFIG_FILE_PATH = 'local/system.json'
STATUS_TOPIC = 'status'

MAKE_CONTROL_DIR =  'make/DEBIAN/control'

PROFILE_FORMAT_PATH = 'resources/risk_assessment.json'
PROFILES_DIR = 'local/risk_profiles'

LOGGER = logger.get_logger('session')


def session_tracker(method):
  """Session changes tracker."""
  def wrapper(self, *args, **kwargs):

    result = method(self, *args, **kwargs)

    if self.get_status() != TestrunStatus.IDLE:
      self.get_mqtt_client().send_message(
                                        STATUS_TOPIC,
                                        jsonable_encoder(self.to_json())
                                        )

    return result
  return wrapper

def apply_session_tracker(cls):
  """Applies tracker decorator to class methods"""
  for attr in dir(cls):
    if (callable(getattr(cls, attr))
      and not attr.startswith('_')
      and not attr.startswith('get')
      and not attr == 'to_json'
      ):
      setattr(cls, attr, session_tracker(getattr(cls, attr)))
  return cls

@apply_session_tracker
class TestrunSession():
  """Represents the current session of Testrun."""

  def __init__(self, root_dir):
    self._root_dir = root_dir

    self._status = TestrunStatus.IDLE
    self._description = None

    # Target test device
    self._device = None

    # Start time of testing
    self._started = None
    self._finished = None

    # Current testing results
    self._results = []

    # All historical reports
    self._module_reports = []

    # Parameters specified when starting Testrun
    self._runtime_params = []

    # All device configurations
    self._device_repository = []

    # Number of tests to be run this session
    self._total_tests = 0

    # Direct url for PDF report
    self._report_url = None

    # Version
    self._load_version()

    # Profiles
    self._profiles = []

    # Profile format that is passed to the frontend
    self._profile_format_json = None

    # Profile format used for internal validation
    self._profile_format = None

    # System configuration
    self._config_file = os.path.join(root_dir, CONFIG_FILE_PATH)
    self._config = self._get_default_config()

    # System network interfaces
    self._ifaces = {}
    # Loading methods
    self._load_version()
    self._load_config()
    self._load_profiles()

    # Network information
    self._ipv4_subnet = None
    self._ipv6_subnet = None

    # Store host user for permissions use
    self._host_user = util.get_host_user()

    self._certs = []
    self.load_certs()

    # Fetch the timezone of the host system
    tz = util.run_command('cat /etc/timezone')
    # TODO: Check if timezone is fetched successfully
    self._timezone = tz[0]
    LOGGER.debug(f'System timezone is {self._timezone}')

    # MQTT client
    self._mqtt_client = mqtt.MQTT()

  def start(self):
    self.reset()
    self._status = TestrunStatus.WAITING_FOR_DEVICE
    self._started = datetime.datetime.now()

  def get_started(self):
    return self._started

  def get_finished(self):
    return self._finished

  def stop(self):
    self.set_status(TestrunStatus.STOPPING)
    self.finish()

  def finish(self):
    # Set any in progress test results to Error
    for test_result in self._results:
      if test_result.result == TestResult.IN_PROGRESS:
        test_result.result = TestResult.ERROR

    self._finished = datetime.datetime.now()

  def _get_default_config(self):
    return {
        'network': {
            'device_intf': '',
            'internet_intf': ''
        },
        'log_level': 'INFO',
        'startup_timeout': 60,
        'monitor_period': 30,
        'max_device_reports': 0,
        'api_url': 'http://localhost',
        'api_port': 8000,
        'org_name': '',
        'single_intf': False,
    }

  def get_config(self):
    return self._config

  def _load_config(self):

    LOGGER.debug(f'Loading configuration file at {self._config_file}')
    if not os.path.isfile(self._config_file):
      LOGGER.error(f'No configuration file present at {self._config_file}. ' +
                   'Default configuration will be used.')
      return

    with open(self._config_file, 'r', encoding='utf-8') as f:
      config_file_json = json.load(f)

      # Network interfaces
      if (NETWORK_KEY in config_file_json
          and DEVICE_INTF_KEY in config_file_json.get(NETWORK_KEY)
          and INTERNET_INTF_KEY in config_file_json.get(NETWORK_KEY)):
        self._config[NETWORK_KEY][DEVICE_INTF_KEY] = config_file_json.get(
            NETWORK_KEY, {}).get(DEVICE_INTF_KEY)
        self._config[NETWORK_KEY][INTERNET_INTF_KEY] = config_file_json.get(
            NETWORK_KEY, {}).get(INTERNET_INTF_KEY)

      if STARTUP_TIMEOUT_KEY in config_file_json:
        self._config[STARTUP_TIMEOUT_KEY] = config_file_json.get(
            STARTUP_TIMEOUT_KEY)

      if MONITOR_PERIOD_KEY in config_file_json:
        self._config[MONITOR_PERIOD_KEY] = config_file_json.get(
            MONITOR_PERIOD_KEY)

      if LOG_LEVEL_KEY in config_file_json:
        self._config[LOG_LEVEL_KEY] = config_file_json.get(LOG_LEVEL_KEY)

      if API_URL_KEY in config_file_json:
        self._config[API_URL_KEY] = config_file_json.get(API_URL_KEY)

      if API_PORT_KEY in config_file_json:
        self._config[API_PORT_KEY] = config_file_json.get(API_PORT_KEY)

      if MAX_DEVICE_REPORTS_KEY in config_file_json:
        self._config[MAX_DEVICE_REPORTS_KEY] = config_file_json.get(
            MAX_DEVICE_REPORTS_KEY)

      if ORG_NAME_KEY in config_file_json:
        self._config[ORG_NAME_KEY] = config_file_json.get(
          ORG_NAME_KEY
        )

  def _load_version(self):
    version_cmd = util.run_command(
        'dpkg-query --showformat=\'${Version}\' --show testrun')
    # index 1 of response is the stderr byte stream so if
    # it has any data in it, there was an error and wen
    # did not resolve the version and we'll use the fallback
    if len(version_cmd[1]) == 0:
      version = version_cmd[0]
      self._version = version
    else:
      LOGGER.debug('Failed getting the version from dpkg-query')
      # Try getting the version from the make control file

      # Check if MAKE_CONTROL_DIR exists
      if not os.path.exists(MAKE_CONTROL_DIR):
        LOGGER.error('make/DEBIAN/control file path not found')
        self._version = 'Unknown'
        return

      try:
        # Run the grep command to find the version line
        grep_cmd = util.run_command(f'grep -R "Version: " {MAKE_CONTROL_DIR}')

        if grep_cmd[0] and len(grep_cmd[1]) == 0:
          # Extract the version number from grep
          version = grep_cmd[0].split()[1]
          self._version = version
          LOGGER.debug(f'Testrun version is: {self._version}')

        else:
          # Error handling if grep can't find the version line
          self._version = 'Unknown'
          LOGGER.debug(f'Testrun version is {self._version}')
          raise Exception('Version line not found in make control file')

      except Exception as e: # pylint: disable=W0703
        LOGGER.debug('Failed getting the version from make control file')
        LOGGER.error(e)
        self._version = 'Unknown'

  def get_host_user(self):
    return self._host_user

  def get_version(self):
    return self._version

  def _save_config(self):
    with open(self._config_file, 'w', encoding='utf-8') as f:
      f.write(json.dumps(self._config, indent=2))
    util.set_file_owner(owner=util.get_host_user(), path=self._config_file)

  def get_log_level(self):
    return self._config.get(LOG_LEVEL_KEY)

  def get_runtime_params(self):
    return self._runtime_params

  def add_runtime_param(self, param):
    if param == 'single_intf':
      self._config['single_intf'] = True
    self._runtime_params.append(param)

  def get_device_interface(self):
    return self._config.get(NETWORK_KEY, {}).get(DEVICE_INTF_KEY)

  def get_device_interface_mac_addr(self):
    iface = self.get_device_interface()
    return IPControl.get_iface_mac_address(iface=iface)

  def get_internet_interface(self):
    return self._config.get(NETWORK_KEY, {}).get(INTERNET_INTF_KEY)

  def get_monitor_period(self):
    return self._config.get(MONITOR_PERIOD_KEY)

  def get_startup_timeout(self):
    return self._config.get(STARTUP_TIMEOUT_KEY)

  def get_api_url(self):
    return self._config.get(API_URL_KEY)

  def get_api_port(self):
    return self._config.get(API_PORT_KEY)

  def get_max_device_reports(self):
    return self._config.get(MAX_DEVICE_REPORTS_KEY)

  def set_config(self, config_json):
    self._config.update(config_json)
    self._save_config()

    # Update log level
    LOGGER.debug(f'Setting log level to {config_json["log_level"]}') # pylint: disable=W1405
    logger.set_log_level(config_json['log_level'])

  def set_target_device(self, device):
    self._device = device

  def get_target_device(self):
    return self._device

  def get_device_by_name(self, device_name):
    for device in self._device_repository:
      if device.device_folder.lower() == device_name.lower():
        return device
    return None

  def get_device_by_make_and_model(self, make, model):
    for device in self._device_repository:
      if device.manufacturer == make and device.model == model:
        return device

  def get_device_repository(self):
    return self._device_repository

  def add_device(self, device):
    self._device_repository.append(device)

  def clear_device_repository(self):
    self._device_repository = []

  def get_device(self, mac_addr):
    for device in self._device_repository:
      if device.mac_addr.lower() == mac_addr.lower():
        return device
    return None

  def remove_device(self, device):
    self._device_repository.remove(device)

  def get_ipv4_subnet(self):
    return self._ipv4_subnet

  def get_ipv6_subnet(self):
    return self._ipv6_subnet

  def get_status(self):
    return self._status

  def set_status(self, status):
    self._status = status

  def set_description(self, desc: str):
    self._description = desc

  def get_test_results(self):
    return self._results

  def get_module_reports(self):
    return self._module_reports

  def get_report_tests(self):
    """Returns the current test results in JSON-friendly format
    (in Python dictionary)"""
    test_results = []
    for test_result in self._results:
      test_results.append(test_result.to_dict())

    return {'total': self.get_total_tests(), 'results': test_results}

  def add_test_result(self, result):

    updated = False

    # Check if test has already been added
    for test_result in self._results:

      # result type is TestCase object
      if test_result.name == result.name:

        # Just update the result, description and recommendations
        if len(result.description) != 0:
          test_result.description = result.description

        # Add recommendations if provided
        if result.recommendations is not None:
          test_result.recommendations = result.recommendations

          if len(result.recommendations) == 0:
            test_result.recommendations = None

        if result.result is not None:

          # Any informational test should always report informational
          if test_result.required_result == 'Informational':

            # Set test result to informational
            if result.result in [
              TestResult.NON_COMPLIANT,
              TestResult.COMPLIANT,
              TestResult.INFORMATIONAL
            ]:
              test_result.result = TestResult.INFORMATIONAL
            else:
              test_result.result = result.result

            # Copy any test recommendations to optional
            test_result.optional_recommendations = result.recommendations

            # Remove recommendations from informational tests
            test_result.recommendations = None
          else:
            test_result.result = result.result

        updated = True

    if not updated:
      self._results.append(result)

  def set_test_result_error(self, result):
    """Set test result error"""
    result.result = TestResult.ERROR
    result.recommendations = None
    self._results.append(result)

  def add_module_report(self, module_report):
    self._module_reports.append(module_report)

  def get_all_reports(self):

    reports = []

    for device in self.get_device_repository():
      device_reports = device.get_reports()
      for device_report in device_reports:
        reports.append(device_report.to_json())
    return sorted(reports, key=lambda report: report['started'], reverse=True)

  def add_total_tests(self, no_tests):
    self._total_tests += no_tests

  def get_total_tests(self):
    return self._total_tests

  def get_report_url(self):
    return self._report_url

  def set_report_url(self, url):
    self._report_url = url

  def set_subnets(self, ipv4_subnet, ipv6_subnet):
    self._ipv4_subnet = ipv4_subnet
    self._ipv6_subnet = ipv6_subnet

  def _load_profiles(self):

    # Load format of questionnaire
    LOGGER.debug('Loading risk assessment format')

    try:
      with open(os.path.join(self._root_dir, PROFILE_FORMAT_PATH),
                encoding='utf-8') as profile_format_file:
        format_json = json.load(profile_format_file)
        # Save original profile format for internal validation
        self._profile_format = format_json
    except (IOError, ValueError) as e:
      LOGGER.error(
          'An error occurred whilst loading the risk assessment format')
      LOGGER.debug(e)

      # If the format JSON fails to load, skip loading profiles
      LOGGER.error('Profiles will not be loaded')
      return

    profile_format_array = []

    # Remove internal properties
    for question_obj in format_json:
      new_obj = {}
      for key in question_obj:
        if key == 'options':
          options = []
          for option in question_obj[key]:
            if isinstance(option, str):
              options.append(option)
            else:
              options.append(option['text'])
          new_obj['options'] = options
        else:
          new_obj[key] = question_obj[key]
      profile_format_array.append(new_obj)
    self._profile_format_json = profile_format_array

    # Load existing profiles
    LOGGER.debug('Loading risk profiles')

    try:
      for risk_profile_file in os.listdir(
          os.path.join(self._root_dir, PROFILES_DIR)):

        LOGGER.debug(f'Discovered profile {risk_profile_file}')

        # Open the risk profile file
        with open(os.path.join(self._root_dir, PROFILES_DIR, risk_profile_file),
                  encoding='utf-8') as f:

          # Parse risk profile json
          json_data: dict = json.load(f)

          # Validate profile JSON
          if not self.validate_profile_json(json_data):
            LOGGER.error('Profile failed validation')
            continue

          # Instantiate a new risk profile
          risk_profile: RiskProfile = RiskProfile()

          # Assign the profile questions
          questions: list[dict] = json_data.get('questions')

          # Pass only the valid questions to the risk profile
          json_data['questions'] = self._remove_invalid_questions(questions)

          # Pass JSON to populate risk profile
          risk_profile.load(profile_json=json_data,
                            profile_format=self._profile_format)

          # Add risk profile to session
          self._profiles.append(risk_profile)

    except Exception as e: # pylint: disable=W0703
      LOGGER.error('An error occurred whilst loading risk profiles')
      LOGGER.debug(e)

  def get_profiles_format(self):
    return self._profile_format_json

  def get_profiles(self):
    return self._profiles

  def get_profile(self, name):
    for profile in self._profiles:
      if profile.name.lower() == name.lower():
        return profile
    return None

  def _get_profile_question(self, profile_json, question):

    for q in profile_json.get('questions'):
      if question.lower() == q.get('question').lower():
        return q

    return None

  def get_profile_format_question(self, question):
    for q in self.get_profiles_format():
      if q.get('question') == question:
        return q

  def update_profile(self, profile_json):
    """Update the risk profile with the provided JSON.
    The content has already been validated in the API"""

    profile_name = profile_json['name']

    # Add version, timestamp and status
    profile_json['version'] = self.get_version()
    profile_json['created'] = datetime.datetime.now().strftime('%Y-%m-%d')

    # Assign the profile questions
    questions: list[dict] = profile_json.get('questions')

    # Pass only the valid questions to the risk profile
    profile_json['questions'] = self._remove_invalid_questions(questions)

    # Check if profile already exists
    risk_profile = self.get_profile(profile_name)
    if risk_profile is None:

      # Create a new risk profile
      risk_profile = RiskProfile(profile_json=profile_json,
                                 profile_format=self._profile_format)
      self._profiles.append(risk_profile)

    else:

      # Update the profile
      risk_profile.update(profile_json, profile_format=self._profile_format)

      # Check if name has changed
      if 'rename' in profile_json:
        old_name = profile_json.get('name')

        # Delete the original file
        os.remove(os.path.join(PROFILES_DIR, old_name + '.json'))

    # Write file to disk
    with open(os.path.join(PROFILES_DIR, risk_profile.name + '.json'),
              'w',
              encoding='utf-8') as f:
      f.write(risk_profile.to_json(pretty=True))

    return risk_profile

  def _remove_invalid_questions(self, questions):
    """Remove unrecognised questions from the profile"""

    # Store valid questions
    valid_questions = []

    # Remove any additional (outdated questions from the profile)
    for question in questions:

      # Check if question exists in the profile format
      if self.get_profile_format_question(
        question=question['question']) is not None:

        # Add the question to the valid_questions
        valid_questions.append(question)

      else:
        LOGGER.debug(f'Removed unrecognised question: {question["question"]}')

    # Return the list of valid questions
    return valid_questions

  def validate_profile_json(self, profile_json):
    """Validate properties in profile update requests"""

    # Get the status field
    valid = False
    if 'status' in profile_json and profile_json.get('status') == 'Valid':
      valid = True

    # Check if 'name' exists in profile
    if 'name' not in profile_json:
      LOGGER.error('Missing "name" in profile')
      return False

    # Check if 'name' field not empty
    elif len(profile_json.get('name').strip()) == 0:
      LOGGER.error('Name field left empty')
      return False

    # Error handling if 'questions' not in request
    if 'questions' not in profile_json and valid:
      LOGGER.error('Missing "questions" field in profile')
      return False

    # Validating the questions section
    for question in profile_json.get('questions'):

      # Check if the question field is present
      if 'question' not in question:
        LOGGER.error('The "question" field is missing')
        return False

      # Check if 'question' field not empty
      elif len(question.get('question').strip()) == 0:
        LOGGER.error('A question is missing from "question" field')
        return False

      # Check if question is a recognised question
      format_q = self.get_profile_format_question(
        question.get('question'))

      if format_q is None:
        LOGGER.error(f'Unrecognised question: {question.get("question")}')
        # Just ignore additional questions
        continue

      # Error handling if 'answer' is missing
      if 'answer' not in question and valid:
        LOGGER.error('The answer field is missing')
        return False

      # If answer is present, check the validation rules
      else:

        # Extract the answer out of the profile
        answer = question.get('answer')

        # Get the validation rules
        field_type = format_q.get('type')

        # Check if type is string or single select, answer should be a string
        if ((field_type in ['string', 'select'])
            and not isinstance(answer, str)):
          LOGGER.error(f'''Answer for question \
{question.get('question')} is incorrect data type''')
          return False

        # Check if type is select, answer must be from list
        if field_type == 'select' and valid:
          possible_answers = format_q.get('options')
          if answer not in possible_answers:
            LOGGER.error(f'''Answer for question \
{question.get('question')} is not valid''')
            return False

        # Validate select multiple field types
        if field_type == 'select-multiple':

          if not isinstance(answer, list):
            LOGGER.error(f'''Answer for question \
{question.get('question')} is incorrect data type''')
            return False

          question_options_len = len(format_q.get('options'))

          # We know it is a list, now check the indexes
          for index in answer:

            # Check if the index is an integer
            if not isinstance(index, int):
              LOGGER.error(f'''Answer for question \
{question.get('question')} is incorrect data type''')
              return False

            # Check if index is 0 or above and less than the num of options
            if index < 0 or index >= question_options_len:
              LOGGER.error(f'''Invalid index provided as answer for \
question {question.get('question')}''')
              return False

    return True

  def delete_profile(self, profile):

    try:
      profile_name = profile.name
      file_name = profile_name + '.json'

      profile_path = os.path.join(PROFILES_DIR, file_name)

      os.remove(profile_path)
      self._profiles.remove(profile)

      return True

    except Exception as e: # pylint: disable=W0703
      LOGGER.error('An error occurred whilst deleting a profile')
      LOGGER.debug(e)
      return False

  def reset(self):
    self.set_status(TestrunStatus.IDLE)
    self.set_description(None)
    self.set_target_device(None)
    self._report_url = None
    self._total_tests = 0
    self._module_reports = []
    self._results = []
    self._started = None
    self._finished = None
    self._ifaces = IPControl.get_sys_interfaces()

  def to_json(self):

    results = {
        'total': self.get_total_tests(),
        'results': self.get_test_results()
    }

    # Remove reports from device for session status
    device = copy.deepcopy(self.get_target_device())
    if device is not None:
      device.reports = None

    session_json = {
        'status': self.get_status(),
        'device': device,
        'started': self.get_started(),
        'finished': self.get_finished(),
        'tests': results
    }

    if self._report_url is not None:
      session_json['report'] = self.get_report_url()

    if self._description is not None:
      session_json['description'] = self._description

    return session_json

  def get_timezone(self):
    return self._timezone

  def upload_cert(self, filename, content):

    now = datetime.datetime.now(pytz.utc)

    # Parse bytes into x509 object
    cert = x509.load_pem_x509_certificate(content, default_backend())

    # Extract required properties
    common_name = cert.subject.get_attributes_for_oid(
        NameOID.COMMON_NAME)[0].value

    # Check if any existing certificates have the same common name
    for cur_cert in self._certs:
      if common_name == cur_cert['name']:
        raise ValueError('A certificate with that name already exists')

    issuer = cert.issuer.get_attributes_for_oid(
        NameOID.ORGANIZATION_NAME)[0].value

    status = 'Valid'
    if now > cert.not_valid_after_utc:
      status = 'Expired'

    # Craft python dictionary with values
    cert_obj = {
        'name': common_name,
        'status': status,
        'organisation': issuer,
        'expires': cert.not_valid_after_utc,
        'filename': filename
    }

    with open(os.path.join(CERTS_PATH, filename), 'wb') as f:
      f.write(content)

    util.run_command(f'chown -R {util.get_host_user()} {CERTS_PATH}')

    return cert_obj

  def check_cert_file_name(self, name):

    # Check for duplicate file name
    if os.path.exists(os.path.join(CERTS_PATH, name)):
      return False

    return True

  def load_certs(self):

    LOGGER.debug(f'Loading certificates from {CERTS_PATH}')

    now = datetime.datetime.now(pytz.utc)

    self._certs = []

    for cert_file in os.listdir(CERTS_PATH):

      # Ignore directories
      if os.path.isdir(os.path.join(CERTS_PATH, cert_file)):
        continue

      LOGGER.debug(f'Loading certificate {cert_file}')
      try:

        # Open certificate file
        with open(
            os.path.join(CERTS_PATH, cert_file),
            'rb',
        ) as f:

          # Parse bytes into x509 object
          cert = x509.load_pem_x509_certificate(f.read(), default_backend())

          # Extract required properties
          common_name = cert.subject.get_attributes_for_oid(
              NameOID.COMMON_NAME)[0].value
          issuer = cert.issuer.get_attributes_for_oid(
              NameOID.ORGANIZATION_NAME)[0].value

          status = 'Valid'
          if now > cert.not_valid_after_utc:
            status = 'Expired'

          # Craft python dictionary with values
          cert_obj = {
              'name': common_name,
              'status': status,
              'organisation': issuer,
              'expires': cert.not_valid_after_utc,
              'filename': cert_file
          }

          # Add certificate to list
          self._certs.append(cert_obj)

          LOGGER.debug(f'Successfully loaded {cert_file}')
      except Exception as e: # pylint: disable=W0703
        LOGGER.error(f'An error occurred whilst loading {cert_file}')
        LOGGER.debug(e)

  def delete_cert(self, filename):

    LOGGER.debug(f'Deleting certificate {filename}')

    try:

      # Delete the cert file
      cert_file = os.path.join(CERTS_PATH, filename)
      os.remove(cert_file)

      # Delete the cert from the session
      for cert in self._certs:
        if cert['filename'] == filename:
          self._certs.remove(cert)
          return True

    except Exception as e: # pylint: disable=W0703
      LOGGER.error('An error occurred whilst deleting the certificate')
      LOGGER.debug(e)
      return False

  def get_certs(self):
    return self._certs

  def detect_network_adapters_change(self) -> dict:
    adapters = {}
    ifaces_new = IPControl.get_sys_interfaces()

    # Difference between stored and newly received network interfaces
    diff = util.diff_dicts(self._ifaces, ifaces_new)
    if diff:
      if 'items_added' in diff:
        adapters['adapters_added'] = diff['items_added']
      if 'items_removed' in diff:
        adapters['adapters_removed'] = diff['items_removed']
      # Save new network interfaces to session
      LOGGER.debug(f'Network adapters change detected: {adapters}')
      self._ifaces = ifaces_new
    return adapters

  def get_mqtt_client(self):
    return self._mqtt_client

  def get_ifaces(self):
    return self._ifaces
