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
from common import util, logger
from common.risk_profile import RiskProfile

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
CERTS_PATH = 'local/root_certs'
CONFIG_FILE_PATH = 'local/system.json'

PROFILE_FORMAT_PATH = 'resources/risk_assessment.json'
PROFILES_DIR = 'local/risk_profiles'

LOGGER = logger.get_logger('session')

class TestrunSession():
  """Represents the current session of Test Run."""

  def __init__(self, root_dir):
    self._root_dir = root_dir

    self._status = 'Idle'

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
    self._profile_format_json = None

    # System configuration
    self._config_file = os.path.join(root_dir, CONFIG_FILE_PATH)
    self._config = self._get_default_config()

    # Loading methods
    self._load_version()
    self._load_config()
    self._load_profiles()

    self._certs = []
    self.load_certs()

    # Fetch the timezone of the host system
    tz = util.run_command('cat /etc/timezone')
    # TODO: Check if timezone is fetched successfully
    self._timezone = tz[0]
    LOGGER.debug(f'System timezone is {self._timezone}')

  def start(self):
    self.reset()
    self._status = 'Waiting for Device'
    self._started = datetime.datetime.now()

  def get_started(self):
    return self._started

  def get_finished(self):
    return self._finished

  def stop(self):
    self.set_status('Stopping')
    self.finish()

  def finish(self):
    # Set any in progress test results to Error
    for test_result in self._results:
      if test_result.result == 'In Progress':
        test_result.result = 'Error'

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
      'api_port': 8000
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

      LOGGER.debug(self._config)

  def _load_version(self):
    version_cmd = util.run_command(
      'dpkg-query --showformat=\'${Version}\' --show testrun')
    # index 1 of response is the stderr byte stream so if
    # it has any data in it, there was an error and we
    # did not resolve the version and we'll use the fallback
    if len(version_cmd[1]) == 0:
      version = version_cmd[0]
      self._version = version
    else:
      LOGGER.debug('Failed getting the version from dpkg-query')
      # Try getting the version from the make control file
      try:
        version = util.run_command('$(grep -R "Version: " $MAKE_CONTROL_DIR | awk "{print $2}"')
      except Exception as e:
        LOGGER.debug('Failed getting the version from make control file')
        LOGGER.error(e)
        self._version = 'Unknown'

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
    self._runtime_params.append(param)

  def get_device_interface(self):
    return self._config.get(NETWORK_KEY, {}).get(DEVICE_INTF_KEY)

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
    LOGGER.debug(f'Setting log level to {config_json["log_level"]}')
    logger.set_log_level(config_json['log_level'])

  def set_target_device(self, device):
    self._device = device

  def get_target_device(self):
    return self._device

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

  def get_status(self):
    return self._status

  def set_status(self, status):
    self._status = status

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

    return {
      'total': self.get_total_tests(),
      'results': test_results
    }

  def add_test_result(self, result):

    updated = False

    # Check if test has already been added
    for test_result in self._results:

      # result type is TestCase object
      if test_result.name == result.name:

        # Just update the result and description
        test_result.result = result.result
        test_result.description = result.description
        test_result.recommendations = result.recommendations
        updated = True

    if not updated:
      result.result = 'In Progress'
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

  def _load_profiles(self):

    # Load format of questionnaire
    LOGGER.debug('Loading risk assessment format')

    try:
      with open(os.path.join(
        self._root_dir, PROFILE_FORMAT_PATH
      ), encoding='utf-8') as profile_format_file:
        self._profile_format_json = json.load(profile_format_file)
    except (IOError, ValueError) as e:
      LOGGER.error(
        'An error occurred whilst loading the risk assessment format')
      LOGGER.debug(e)
    
    # Load existing profiles
    LOGGER.debug('Loading risk profiles')

    try:
      for risk_profile_file in os.listdir(os.path.join(
        self._root_dir, PROFILES_DIR
      )):
        LOGGER.debug(f'Discovered profile {risk_profile_file}')

        with open(os.path.join(
          self._root_dir, PROFILES_DIR, risk_profile_file
        ), encoding='utf-8') as f:
          json_data = json.load(f)
          risk_profile = RiskProfile(json_data)
          self._profiles.append(risk_profile)

    except Exception as e:
      LOGGER.error('An error occurred whilst loading risk profiles')
      LOGGER.debug(e)

  def get_profiles_format(self):
    return self._profile_format_json
  
  def get_profiles(self):
    return self._profiles

  def reset(self):
    self.set_status('Idle')
    self.set_target_device(None)
    self._report_url = None
    self._total_tests = 0
    self._module_reports = []
    self._results = []
    self._started = None
    self._finished = None

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

    return session_json

  def get_timezone(self):
    return self._timezone

  def upload_cert(self, filename, content):

    now = datetime.datetime.now(pytz.utc)

    try:
      # Parse bytes into x509 object
      cert = x509.load_pem_x509_certificate(content, default_backend())

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
        'filename': filename
      }

      with open(os.path.join(CERTS_PATH, filename), 'wb') as f:
        f.write(content)

      util.run_command(f'chown -R {util.get_host_user()} {CERTS_PATH}')

      return cert_obj

    except Exception as e:
      LOGGER.error('An error occured whilst parsing a certificate')
      LOGGER.debug(e)
      return None

  def check_cert_file_name(self, name):

    if os.path.exists(os.path.join(CERTS_PATH, name)):
      return False

    return True

  def load_certs(self):

    LOGGER.debug(f'Loading certificates from {CERTS_PATH}')

    now = datetime.datetime.now(pytz.utc)

    self._certs = []

    for cert_file in os.listdir(CERTS_PATH):
      LOGGER.debug(f'Loading certificate {cert_file}')
      try:

        # Open certificate file
        with open(
          os.path.join(
            CERTS_PATH, cert_file), 'rb',) as f:

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
      except Exception as e:
        LOGGER.error(f'An error occurred whilst loading {cert_file}')
        LOGGER.debug(e)

  def delete_cert(self, filename):

    LOGGER.debug(f'Deleting certificate {filename}')

    try:
      cert_file = os.path.join(CERTS_PATH, filename)
      os.remove(cert_file)
      return True
    except Exception as e:
      LOGGER.error('An error occurred whilst deleting the certificate')
      LOGGER.debug(e)
      return False

  def get_certs(self):
    return self._certs
