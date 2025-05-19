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
"""Provides high level management of the test orchestrator."""
import copy
import os
import json
import re
import time
import shutil
import docker
from datetime import datetime
from common import logger, util
from common.testreport import TestReport
from common.statuses import TestrunStatus, TestrunResult, TestResult
from core.docker.test_docker_module import TestModule
from test_orc.test_case import TestCase
from test_orc.test_pack import TestPack
import threading
from typing import List

LOG_NAME = "test_orc"
LOGGER = logger.get_logger("test_orc")

RUNTIME_DIR = "runtime"
RESOURCES_DIR = "resources"

RUNTIME_TEST_DIR = os.path.join(RUNTIME_DIR, "test")
TEST_PACKS_DIR = os.path.join(RESOURCES_DIR, "test_packs")
TEST_PACK_CONFIG_FILE = "config.json"
TEST_PACK_LOGIC_FILE = "test_pack.py"

TEST_MODULES_DIR = "modules/test"
MODULE_CONFIG = "conf/module_config.json"

SAVED_DEVICE_REPORTS = "report/{device_folder}/"
LOCAL_DEVICE_REPORTS = "local/devices/{device_folder}/reports"
DEVICE_ROOT_CERTS = "local/root_certs"

LOG_REGEX = r"^[A-Z][a-z]{2} [0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2} test_"
API_URL = "http://localhost:8000"


class TestOrchestrator:
  """Manages and controls the test modules."""

  def __init__(self, session, net_orc):

    self._test_modules: List[TestModule] = []
    self._test_packs: List[TestPack] = []

    self._container_logs = []
    self._session = session

    self._api_url = (self.get_session().get_api_url() + ":" +
                     str(self.get_session().get_api_port()))

    self._net_orc = net_orc
    self._test_in_progress = False

    self._root_path = os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.realpath(__file__))))))
    self._test_modules_running = []
    self._current_module = 0

  def start(self):
    LOGGER.debug("Starting test orchestrator")

    # Setup the output directory
    self._host_user = util.get_host_user()
    os.makedirs(RUNTIME_TEST_DIR, exist_ok=True)
    util.run_command(f"chown -R {self._host_user} {RUNTIME_TEST_DIR}")

    # Setup the root_certs folder
    os.makedirs(DEVICE_ROOT_CERTS, exist_ok=True)

    self._load_test_modules()
    self._load_test_packs()

  def stop(self):
    """Stop any running tests"""
    self._stop_modules()

  def run_test_modules(self):
    """Iterates through each test module and starts the container."""

    # Do not start test modules if status is not in progress, e.g. Stopping
    if self.get_session().get_status() != TestrunStatus.IN_PROGRESS:
      return

    device = self.get_session().get_target_device()
    test_pack_name = device.test_pack
    test_pack = self.get_test_pack(test_pack_name)
    LOGGER.debug("Using test pack " + test_pack.name)

    self._test_in_progress = True

    LOGGER.info(
        f"Running test modules on device with mac addr {device.mac_addr}")

    test_modules = []

    for module in self._test_modules:

      # Ignore test modules that are just base images etc
      if module is None or not module.enable_container:
        continue

      # Ignore test modules that are disabled for this device
      if not self._is_module_enabled(module, device):
        continue

      num_tests = 0

      # Add module to list of modules to run
      test_modules.append(module)

      for test in module.tests:

        # Duplicate test obj so we don't alter the source
        test_copy = copy.deepcopy(test)

        # Do not add test if it is not enabled
        if not self._is_test_enabled(test_copy.name, device):
          continue

        # Set result to Not Started
        test_copy.result = TestResult.NOT_STARTED

        # We don't want steps to resolve for not started tests
        if hasattr(test_copy, "recommendations"):
          test_copy.recommendations = None

        # Set the required result from the correct test pack
        required_result = test_pack.get_required_result(test.name)

        test_copy.required_result = required_result

        # Add test result to the session
        self.get_session().add_test_result(test_copy)

        # Increment number of tests being run by this module
        num_tests += 1

      # Increment number of tests that will be run
      self.get_session().add_total_tests(num_tests)

    # Store enabled test modules in the TestOrchectrator object
    self._test_modules_running = test_modules
    self._current_module = 0

    for index, module in enumerate(test_modules):

      self._current_module = index
      self._run_test_module(module)

    LOGGER.info("All tests complete")

    self.get_session().finish()

    # Do not carry on (generating a report) if Testrun has been stopped
    if self.get_session().get_status() != TestrunStatus.IN_PROGRESS:
      return TestrunStatus.CANCELLED

    report = TestReport()

    generated_report_json = self._generate_report()
    report.from_json(generated_report_json)
    report.add_module_reports(self.get_session().get_module_reports())
    report.add_module_templates(self.get_session().get_module_templates())
    device.add_report(report)

    self._write_reports(report)
    self._test_in_progress = False
    self.get_session().set_report_url(report.get_report_url())
    self.get_session().set_export_url(report.get_export_url())

    # Set testing description
    test_pack: TestPack = self.get_test_pack(device.test_pack)

    # Default message is empty (better than an error message).
    # This should never be shown
    message: str = ""
    if report.get_result() == TestrunResult.COMPLIANT:
      message = test_pack.get_message("compliant_description")
    elif report.get_result() == TestrunResult.NON_COMPLIANT:
      message = test_pack.get_message("non_compliant_description")

    self.get_session().set_description(message)

    # Set result and status at the end
    self.get_session().set_result(report.get_result())
    self.get_session().set_status(report.get_status())

    # Move testing output from runtime to local device folder
    self._timestamp_results(device)

    LOGGER.debug("Cleaning old test results...")
    self._cleanup_old_test_results(device)

    LOGGER.debug("Old test results cleaned")

  def _write_reports(self, test_report):

    out_dir = os.path.join(
        self._root_path, RUNTIME_TEST_DIR,
        self.get_session().get_target_device().mac_addr.replace(":", ""))

    LOGGER.debug(f"Writing reports to {out_dir}")

    # Write the json report
    with open(os.path.join(out_dir, "report.json"), "w", encoding="utf-8") as f:
      json.dump(test_report.to_json(), f, indent=2)

    # Write the html report
    with open(os.path.join(out_dir, "report.html"), "w", encoding="utf-8") as f:
      f.write(test_report.to_html())

    # Write the pdf report
    with open(os.path.join(out_dir, "report.pdf"), "wb") as f:
      f.write(test_report.to_pdf().getvalue())

    util.run_command(f"chown -R {self._host_user} {out_dir}")

  def _generate_report(self):

    device = self.get_session().get_target_device()
    test_pack_name = device.test_pack
    test_pack = self.get_test_pack(test_pack_name)

    report = {}
    report["testrun"] = {"version": self.get_session().get_version()}

    report["mac_addr"] = device.mac_addr
    report["device"] = device.to_dict()
    report["started"] = self.get_session().get_started().strftime(
        "%Y-%m-%d %H:%M:%S")
    report["finished"] = self.get_session().get_finished().strftime(
        "%Y-%m-%d %H:%M:%S")

    # Update the result
    result = test_pack.get_logic().calculate_result(
      self.get_session().get_test_results())
    report["result"] = result

    # Update the status
    status = test_pack.get_logic().calculate_status(
      result,
      self.get_session().get_test_results())
    report["status"] = status

    report["tests"] = self.get_session().get_report_tests()
    report["report"] = (
        self._api_url + "/" + SAVED_DEVICE_REPORTS.replace(
            "{device_folder}",
            device.device_folder) +
        self.get_session().get_started().strftime("%Y-%m-%dT%H:%M:%S"))
    report["export"] = report["report"].replace("report", "export")

    return report

  def _cleanup_old_test_results(self, device):

    if device.max_device_reports is not None:
      max_device_reports = device.max_device_reports
    else:
      max_device_reports = self.get_session().get_max_device_reports()

    if max_device_reports > 0:
      completed_results_dir = os.path.join(
          self._root_path,
          LOCAL_DEVICE_REPORTS.replace("{device_folder}", device.device_folder))

      completed_tests = os.listdir(completed_results_dir)
      cur_test_count = len(completed_tests)
      if cur_test_count > max_device_reports:
        LOGGER.debug("Current device has more than max results allowed: " +
                     str(cur_test_count) + ">" + str(max_device_reports))

        # Find and delete the oldest test
        oldest_test = self._find_oldest_test(completed_results_dir)
        if oldest_test is not None:
          LOGGER.debug("Oldest test found, removing: " + str(oldest_test[1]))
          shutil.rmtree(oldest_test[1], ignore_errors=True)

          # Remove oldest test from session
          oldest_timestamp = oldest_test[0]
          self.get_session().get_target_device().remove_report(oldest_timestamp)

          # Confirm the delete was succesful
          new_test_count = len(os.listdir(completed_results_dir))
          if (new_test_count != cur_test_count
              and new_test_count > max_device_reports):
            # Continue cleaning up until we're under the max
            self._cleanup_old_test_results(device)

  def _find_oldest_test(self, completed_tests_dir):
    oldest_timestamp = None
    oldest_directory = None
    for completed_test in os.listdir(completed_tests_dir):
      try:
        timestamp = datetime.strptime(str(completed_test), "%Y-%m-%dT%H:%M:%S")

      # Occurs when time does not match format
      except ValueError as e:
        LOGGER.error(e)
        continue

      if oldest_timestamp is None or timestamp < oldest_timestamp:
        oldest_timestamp = timestamp
        oldest_directory = completed_test

    if oldest_directory:
      return oldest_timestamp, os.path.join(completed_tests_dir,
                                            oldest_directory)
    else:
      return None

  def _timestamp_results(self, device):

    # Define the current device results directory
    cur_results_dir = os.path.join(self._root_path, RUNTIME_DIR)

    # Define the directory
    completed_results_dir = os.path.join(
        self._root_path,
        LOCAL_DEVICE_REPORTS.replace("{device_folder}", device.device_folder),
        self.get_session().get_started().strftime("%Y-%m-%dT%H:%M:%S"))

    # Copy the results to the timestamp directory
    # leave current copy in place for quick reference to
    # most recent test
    shutil.copytree(cur_results_dir, completed_results_dir, dirs_exist_ok=True)
    util.run_command(f"chown -R {self._host_user} '{completed_results_dir}'")

    # Copy Testrun log to testing directory
    shutil.copy(os.path.join(self._root_path, "testrun.log"),
                os.path.join(completed_results_dir, "testrun.log"))

    return completed_results_dir

  def zip_results(self, device, timestamp: str, profile):

    try:
      LOGGER.debug("Archiving test results")

      src_path = os.path.join(
          LOCAL_DEVICE_REPORTS.replace("{device_folder}", device.device_folder),
          timestamp)

      # Regenerate the report if the device profile has been updated
      self._regenerate_report_files(device, timestamp)

      # Define temp directory to store files before zipping
      results_dir = os.path.join(f"/tmp/testrun/{time.time()}")

      # Define where to save the zip file
      zip_location = os.path.join("/tmp/testrun", timestamp)

      # Delete zip_temp if it already exists
      if os.path.exists(results_dir):
        os.remove(results_dir)

      # Delete ZIP if it already exists
      if os.path.exists(zip_location + ".zip"):
        os.remove(zip_location + ".zip")

      shutil.copytree(src_path, results_dir)

      # Include profile if specified
      if profile is not None:
        LOGGER.debug(f"Copying profile {profile.name} to results directory")
        shutil.copy(profile.get_file_path(),
                    os.path.join(results_dir, "profile.json"))

        with open(os.path.join(results_dir, "profile.pdf"), "wb") as f:
          f.write(profile.to_pdf(device).getvalue())

      # Create ZIP archive
      shutil.make_archive(zip_location, "zip", results_dir)

      # Delete the temp results directory
      shutil.rmtree(results_dir)

      # Check that the ZIP was successfully created
      zip_file = zip_location + ".zip"
      LOGGER.info(f"""Archive {"created at " + zip_file
                                if os.path.exists(zip_file)
                                else "creation failed"}""")

      return zip_file

    except Exception as error:  # pylint: disable=W0703
      LOGGER.error("Failed to create zip file")
      LOGGER.debug(error)
      return None

  def regenerate_pdf(self, device, timestamp):
    """Regenerate the pdf report"""
    self._regenerate_report_files(device, timestamp)

  def _regenerate_report_files(self, device, timestamp):
    '''Regenerate the report if the device profile has been updated'''

    try:

      # Report files path
      report_path = os.path.join(
          LOCAL_DEVICE_REPORTS.replace("{device_folder}", device.device_folder),
          timestamp, "test", device.mac_addr.replace(":", ""))

      # Parse string timestamp
      date_timestamp: datetime.datetime = datetime.strptime(
          timestamp, "%Y-%m-%dT%H:%M:%S")

      # Find the report
      test_report = None
      for report in device.get_reports():
        if report.get_started() == date_timestamp:
          test_report = report

      # This should not happen as the timestamp is checked in api.py first
      if test_report is None:
        return None

      # Copy the original report for comparison
      test_report_copy = copy.deepcopy(test_report)

      # Update the report with 'additional_info' field
      test_report.update_device_profile(device.additional_info)

      # Overwrite report only if additional_info has been changed
      if test_report.to_json() != test_report_copy.to_json():
        LOGGER.debug("Device profile has been updated, regenerating the report")

        # Store the jinja templates
        reload_templates = []

        # Load the jinja templates
        if os.path.isdir(report_path):
          for dir_path, _, filenames in os.walk(report_path):
            for filename in filenames:
              try:
                if filename.endswith(".j2.html"):
                  with open(os.path.join(dir_path, filename), "r",
                            encoding="utf-8") as f:
                    reload_templates.append(f.read())
              except Exception as e:
                LOGGER.debug(f"Could not read the file: {e}")

        # Add the jinja templates to the report
        test_report.add_module_templates(reload_templates)

        # Rewrite the json report
        with open(os.path.join(report_path, "report.json"),
                  "w",
                  encoding="utf-8") as f:
          json.dump(test_report.to_json(), f, indent=2)

        # Rewrite the html report
        with open(os.path.join(report_path, "report.html"),
                  "w",
                  encoding="utf-8") as f:
          f.write(test_report.to_html())

        # Rewrite the pdf report
        with open(os.path.join(report_path, "report.pdf"), "wb") as f:
          f.write(test_report.to_pdf().getvalue())

        LOGGER.debug("Report has been regenerated")

    except Exception as error:
      LOGGER.error("Failed to regenerate the report")
      LOGGER.debug(error)

  def test_in_progress(self):
    return self._test_in_progress

  def _is_module_enabled(self, module, device):

    # Enable module as fallback
    enabled = True

    if device.test_modules is not None:
      test_modules = device.test_modules
      if module.name in test_modules:
        if "enabled" in test_modules[module.name]:
          enabled = test_modules[module.name]["enabled"]
      else:
        # Module has not been specified in the device config
        enabled = module.enabled

    return enabled

  def _is_test_enabled(self, test, device):

    test_pack_name = device.test_pack
    test_pack = self.get_test_pack(test_pack_name)

    return test_pack.get_test(test) is not None

  def _run_test_module(self, module):
    """Start the test container and extract the results."""

    # Check that Testrun is not stopping
    if self.get_session().get_status() != TestrunStatus.IN_PROGRESS:
      return

    device = self.get_session().get_target_device()

    LOGGER.info(f"Running test module {module.name}")

    # Get all tests to be executed and set to in progress
    for current_test, test in enumerate(module.tests):

      # Check that device is connected
      if not self._net_orc.is_device_connected():
        LOGGER.error("Device was disconnected")
        self._set_test_modules_error(current_test)
        self.get_session().set_status(TestrunStatus.CANCELLED)
        return

      # Copy the test so we don't alter the source
      test_copy = copy.deepcopy(test)

      # Update test status to in progress
      test_copy.result = TestResult.IN_PROGRESS

      # We don't want steps to resolve for in progress tests
      if hasattr(test_copy, "recommendations"):
        test_copy.recommendations = None

      # Only add/update the test if it is enabled
      if self._is_test_enabled(test_copy.name, device):
        self.get_session().add_test_result(test_copy)

    # Start the test module
    module.start(device)

    # Mount the test container to the virtual network if requried
    if module.network:
      LOGGER.debug("Attaching test module to the network")
      self._net_orc.attach_test_module_to_network(module)

    # Determine the module timeout time
    test_module_timeout = time.time() + module.timeout

    # Resolving container logs is blocking so we need to spawn a new thread
    log_stream = module.container.logs(stream=True, stdout=True, stderr=True)
    log_thread = threading.Thread(target=self._get_container_logs,
                                  args=(log_stream, ))
    log_thread.daemon = True
    log_thread.start()

    while (module.get_status() == "running"
           and self.get_session().get_status() == TestrunStatus.IN_PROGRESS):

      # Check that timeout has not exceeded
      if time.time() > test_module_timeout:
        LOGGER.error("Module timeout exceeded, killing module: " + module.name)
        module.stop(kill=True)

        # Update the test description for the tests
        for test in module.tests:

          # Copy the test so we don't alter the source
          test_copy = copy.deepcopy(test)

          # Update test
          test_copy.result = TestResult.ERROR
          test_copy.description = (
            "Module timeout exceeded. Try increasing the timeout value."
          )
          self.get_session().add_test_result(test_copy)

        break

    # Save all container logs to file
    with open(module.container_log_file, "w", encoding="utf-8") as f:
      for line in self._container_logs:
        f.write(line + "\n")

    # Check that Testrun has not been stopped whilst this module was running
    if self.get_session().get_status() == TestrunStatus.STOPPING:
      # Discard results for this module
      LOGGER.info(f"Test module {module.name} has forcefully quit")
      return

    results_file = f"{module.container_runtime_dir}/{module.name}-result.json"

    try:
      with open(results_file, "r", encoding="utf-8-sig") as f:

        # Load results from JSON file
        module_results_json = json.load(f)
        module_results = module_results_json["results"]
        for test_result in module_results:

          # Convert dict from json into TestCase object
          test_case = TestCase(name=test_result["name"],
                               result=test_result["result"],
                               description=test_result["description"],
                               details=test_result["details"]
                               )

          # Add steps to resolve if test is non-compliant
          if (test_case.result == TestResult.NON_COMPLIANT
              and "recommendations" in test_result):
            test_case.recommendations = test_result["recommendations"]
          else:
            test_case.recommendations = []

          self.get_session().add_test_result(test_case)

    except (FileNotFoundError, PermissionError,
            json.JSONDecodeError) as results_error:
      LOGGER.error(
          f"Error occurred whilst obtaining results for module {module.name}")
      LOGGER.error(results_error)

    # Get the markdown report from the module if generated
    markdown_file = f"{module.container_runtime_dir}/{module.name}_report.md"
    try:
      with open(markdown_file, "r", encoding="utf-8") as f:
        module_report = f.read()
        self.get_session().add_module_report(module_report)
    except (FileNotFoundError, PermissionError):
      LOGGER.debug("Test module did not produce a markdown module report")

    # Get the HTML report from the module if generated
    html_file = f"{module.container_runtime_dir}/{module.name}_report.html"
    try:
      with open(html_file, "r", encoding="utf-8") as f:
        module_report = f.read()
        LOGGER.debug(f"Adding module report for module {module.name}")
        self.get_session().add_module_report(module_report)
    except (FileNotFoundError, PermissionError):
      LOGGER.debug("Test module did not produce a html module report")
    # Get the Jinja report
    jinja_file = f"{module.container_runtime_dir}/{module.name}_report.j2.html"
    try:
      with open(jinja_file, "r", encoding="utf-8") as f:
        module_template = f.read()
        LOGGER.debug(f"Adding module template for module {module.name}")
        self.get_session().add_module_template(module_template)
    except (FileNotFoundError, PermissionError):
      LOGGER.debug("Test module did not produce a module template")

    # LOGGER.info(f"Test module {module.name} has finished")

  def _get_container_logs(self, log_stream):
    """Resolve all current log data in the containers log_stream
    this method is blocking so should be called in
    a thread or within a proper blocking context"""
    self._container_logs = []
    for log_chunk in log_stream:
      lines = log_chunk.decode("utf-8").splitlines()

      # Process each line and strip blank space
      processed_lines = [line.strip() for line in lines if line.strip()]
      self._container_logs.extend(processed_lines)
      for line in lines:
        if re.search(LOG_REGEX, line):
          print(line)

  def _get_module_status(self, module):
    container = self._get_module_container(module)
    if container is not None:
      return container.status
    return None

  def _get_test_module(self, name):
    for test_module in self._test_modules:
      if name in [
          test_module.display_name, test_module.name, test_module.dir_name
      ]:
        return test_module
    return None

  def _get_module_container(self, module):
    container = None
    try:
      client = docker.from_env()
      container = client.containers.get(module.container_name)
    except docker.errors.NotFound:
      LOGGER.debug("Container " + module.container_name + " not found")
    except docker.errors.APIError as error:
      LOGGER.error("Failed to resolve container")
      LOGGER.error(error)
    return container

  def _load_test_packs(self):

    self._test_packs = TestPack.get_test_packs()

  def _load_test_modules(self):
    """Load network modules from module_config.json."""
    LOGGER.debug("Loading test modules from /" + TEST_MODULES_DIR)

    loaded_modules = "Loaded the following test modules: "
    test_modules_dir = os.path.join(self._root_path, TEST_MODULES_DIR)

    module_dirs = os.listdir(test_modules_dir)
    # Check if the directory protocol exists and move it to the beginning
    # protocol should always be run first so BACnet binding doesn't get
    # corrupted during DHCP changes in the conn module
    if "protocol" in module_dirs:
      module_dirs.insert(0, module_dirs.pop(module_dirs.index("protocol")))
    # Check if the directory services exists and move it higher in the index
    # so it always runs before connection. Connection may cause too many
    # DHCP changes causing nmap to use wrong IP during scan
    if "services" in module_dirs and "conn" in module_dirs:
      module_dirs.insert(module_dirs.index("conn"),
                         module_dirs.pop(module_dirs.index("services")))

    for module_dir in module_dirs:

      if self._get_test_module(module_dir) is None:
        loaded_module = self._load_test_module(module_dir)
        loaded_modules += loaded_module.dir_name + " "

    LOGGER.info(loaded_modules)

  def _load_test_module(self, module_dir):
    """Import module configuration from module_config.json."""

    # Resolve the main docker interface (docker0) for host interaction
    # Can't use device or internet iface since these are not in a stable
    # state for this type of communication during testing but docker0 has
    # to exist and should always be available
    external_ip = self._net_orc.get_ip_address("docker0")
    extra_hosts = {
        "external.localhost": external_ip
    } if external_ip is not None else {}

    # Make sure we only load each module once since some modules will
    # depend on the same module
    if not any(m.dir_name == module_dir for m in self._test_modules):

      modules_dir = os.path.join(self._root_path, TEST_MODULES_DIR)

      module_conf_file = os.path.join(self._root_path, modules_dir, module_dir,
                                      MODULE_CONFIG)

      module = TestModule(module_conf_file, self, self.get_session(),
                          extra_hosts)
      if module.depends_on is not None:
        self._load_test_module(module.depends_on)
      self._test_modules.append(module)

      return module

  def get_test_packs(self) -> List[TestPack]:
    return self._test_packs

  def get_test_pack(self, name: str) -> TestPack:
    return TestPack.get_test_pack(name, self._test_packs)

  def _stop_modules(self, kill=False):
    LOGGER.info("Stopping test modules")
    for module in self._test_modules:
      # Test modules may just be Docker images, so we do not want to stop them
      if not module.enable_container:
        continue
      self._stop_module(module, kill)
    LOGGER.info("All test modules have been stopped")

  def _stop_module(self, module, kill=False):
    LOGGER.debug("Stopping test module " + module.container_name)
    module.stop(kill=kill)

  def get_test_modules(self):
    return self._test_modules

  def get_test_module(self, name):
    for test_module in self.get_test_modules():
      if test_module.name == name:
        return test_module
    return None

  def get_test_cases(self):
    test_cases = []
    for test_module in self.get_test_modules():
      for test_case in test_module.tests:
        test_cases.append(test_case)
    return test_cases

  def get_test_case(self, name):
    for test_case in self.get_test_cases():
      if test_case.name == name:
        return test_case
    return None

  def get_session(self):
    return self._session

  def _set_test_modules_error(self, current_test):
    """Set all remaining tests to error"""
    for i in range(self._current_module, len(self._test_modules_running)):
      start_idx = current_test if i == self._current_module else 0
      for j in range(start_idx, len(self._test_modules_running[i].tests)):
        self.get_session().set_test_result_error(
            self._test_modules_running[i].tests[j],
            "Test did not run, the device was disconnected")
