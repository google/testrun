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
from docker.types import Mount
from common import logger, util
from common.testreport import TestReport
from test_orc.module import TestModule
from test_orc.test_case import TestCase
import threading

LOG_NAME = "test_orc"
LOGGER = logger.get_logger("test_orc")
RUNTIME_DIR = "runtime"
RUNTIME_TEST_DIR = os.path.join(RUNTIME_DIR,"test")
TEST_MODULES_DIR = "modules/test"
MODULE_CONFIG = "conf/module_config.json"
LOG_REGEX = r"^[A-Z][a-z]{2} [0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2} test_"
SAVED_DEVICE_REPORTS = "report/{device_folder}/"
LOCAL_DEVICE_REPORTS = "local/devices/{device_folder}/reports"
DEVICE_ROOT_CERTS = "local/root_certs"
API_URL = "http://localhost:8000"


class TestOrchestrator:
  """Manages and controls the test modules."""

  def __init__(self, session, net_orc):
    self._test_modules = []
    self._container_logs = []
    self._session = session
    self._api_url = (self._session.get_api_url() + ":" +
                     str(self._session.get_api_port()))
    self._net_orc = net_orc
    self._test_in_progress = False
    self._path = os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.realpath(__file__))))))

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

  def stop(self):
    """Stop any running tests"""
    self._stop_modules()

  def run_test_modules(self):
    """Iterates through each test module and starts the container."""

    # Do not start test modules if status is not in progress, e.g. Stopping
    if self.get_session().get_status() != "In Progress":
      return

    device = self._session.get_target_device()
    self._test_in_progress = True
    LOGGER.info(
        f"Running test modules on device with mac addr {device.mac_addr}")

    test_modules = []
    for module in self._test_modules:

      if module is None or not module.enable_container:
        continue

      if not self._is_module_enabled(module, device):
        continue

      test_modules.append(module)
      self.get_session().add_total_tests(len(module.tests))

    # Store enabled test modules in the TestsOrchectrator object
    self._test_modules_running = test_modules
    self._current_module = 0

    for index, module in enumerate(test_modules):

      self._current_module = index
      self._run_test_module(module)

    LOGGER.info("All tests complete")

    self._session.finish()

    # Do not carry on (generating a report) if Testrun has been stopped
    if self.get_session().get_status() != "In Progress":
      return "Cancelled"

    report = TestReport()
    report.from_json(self._generate_report())
    report.add_module_reports(self.get_session().get_module_reports())
    device.add_report(report)

    self._write_reports(report)
    self._test_in_progress = False
    self.get_session().set_report_url(report.get_report_url())

    # Move testing output from runtime to local device folder
    self._timestamp_results(device)

    LOGGER.debug("Cleaning old test results...")
    self._cleanup_old_test_results(device)

    LOGGER.debug("Old test results cleaned")

    return report.get_status()

  def _write_reports(self, test_report):

    out_dir = os.path.join(
        self._root_path, RUNTIME_TEST_DIR,
        self._session.get_target_device().mac_addr.replace(":", ""))

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

    report = {}
    report["testrun"] = {
      "version": self.get_session().get_version()
    }

    report["mac_addr"] = self.get_session().get_target_device().mac_addr
    report["device"] = self.get_session().get_target_device().to_dict()
    report["started"] = self.get_session().get_started().strftime(
        "%Y-%m-%d %H:%M:%S")
    report["finished"] = self.get_session().get_finished().strftime(
        "%Y-%m-%d %H:%M:%S")
    report["status"] = self._calculate_result()
    report["tests"] = self.get_session().get_report_tests()
    report["report"] = (
        self._api_url + "/" + SAVED_DEVICE_REPORTS.replace(
            "{device_folder}",
            self.get_session().get_target_device().device_folder) +
        self.get_session().get_started().strftime("%Y-%m-%dT%H:%M:%S"))

    return report

  def _calculate_result(self):
    result = "Compliant"
    for test_result in self._session.get_test_results():
      # Check Required tests
      if (test_result.required_result.lower() == "required"
          and test_result.result.lower() != "compliant"):
        result = "Non-Compliant"
      # Check Required if Applicable tests
      elif (test_result.required_result.lower() == "required if applicable"
            and test_result.result.lower() == "non-compliant"):
        result = "Non-Compliant"
    return result

  def _cleanup_old_test_results(self, device):

    if device.max_device_reports is not None:
      max_device_reports = device.max_device_reports
    else:
      max_device_reports = self._session.get_max_device_reports()

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

  def zip_results(self,
                   device,
                   timestamp,
                   profile):

    try:
      LOGGER.debug("Archiving test results")

      src_path = os.path.join(LOCAL_DEVICE_REPORTS.replace(
        "{device_folder}",
        device.device_folder),
        timestamp)

      # Define temp directory to store files before zipping
      results_dir = os.path.join(f"/tmp/testrun/{time.time()}")

      # Define where to save the zip file
      zip_location = os.path.join("/tmp/testrun",
                                  timestamp)

      # Delete zip_temp if it already exists
      if os.path.exists(results_dir):
        os.remove(results_dir)

      # Delete ZIP if it already exists
      if os.path.exists(zip_location + ".zip"):
        os.remove(zip_location + ".zip")

      shutil.copytree(src_path,results_dir)

      # Include profile if specified
      if profile is not None:
        LOGGER.debug(
          f"Copying profile {profile.name} to results directory")
        shutil.copy(profile.get_file_path(),
                    os.path.join(
                      results_dir,
                      "profile.json"))

        with open(os.path.join(results_dir, "profile.pdf"), "wb") as f:
          f.write(profile.to_pdf(device).getvalue())

      # Create ZIP archive
      shutil.make_archive(zip_location, "zip", results_dir)

      # Delete the temp results directory
      shutil.rmtree(results_dir)

      # Check that the ZIP was successfully created
      zip_file = zip_location + ".zip"
      LOGGER.info(f'''Archive {'created at ' + zip_file
                                if os.path.exists(zip_file)
                                else'creation failed'}''')


      return zip_file

    except Exception as error: # pylint: disable=W0703
      LOGGER.error("Failed to create zip file")
      LOGGER.debug(error)
      return None

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

  def _run_test_module(self, module):
    """Start the test container and extract the results."""

    # Check that Testrun is not stopping
    if self.get_session().get_status() != "In Progress":
      return

    device = self._session.get_target_device()

    LOGGER.info(f"Running test module {module.name}")

    # Get all tests to be executed and set to in progress
    for current_test,test in enumerate(module.tests):

      # Check that device is connected
      if not self._net_orc.is_device_connected():
        LOGGER.error("Device was disconnected")
        self._set_test_modules_error(current_test)
        self._session.set_status("Cancelled")
        return

      test_copy = copy.deepcopy(test)
      test_copy.result = "In Progress"

      # We don't want steps to resolve for in progress tests
      if hasattr(test_copy, "recommendations"):
        test_copy.recommendations = None

      self.get_session().add_test_result(test_copy)

    try:

      device_test_dir = os.path.join(self._root_path, RUNTIME_TEST_DIR,
                                     device.mac_addr.replace(":", ""))

      container_runtime_dir = os.path.join(device_test_dir, module.name)
      os.makedirs(container_runtime_dir, exist_ok=True)

      config_file = os.path.join(self._root_path, "local/system.json")
      root_certs_dir = os.path.join(self._root_path, "local/root_certs")

      container_log_file = os.path.join(container_runtime_dir, "module.log")

      network_runtime_dir = os.path.join(self._root_path, "runtime/network")

      device_startup_capture = os.path.join(device_test_dir, "startup.pcap")
      util.run_command(f"chown -R {self._host_user} {device_startup_capture}")

      device_monitor_capture = os.path.join(device_test_dir, "monitor.pcap")
      util.run_command(f"chown -R {self._host_user} {device_monitor_capture}")

      client = docker.from_env()

      module.container = client.containers.run(
          module.image_name,
          auto_remove=True,
          cap_add=["NET_ADMIN"],
          name=module.container_name,
          hostname=module.container_name,
          privileged=True,
          detach=True,
          mounts=[
              Mount(target="/testrun/system.json",
                    source=config_file,
                    type="bind",
                    read_only=True),
              Mount(target="/testrun/root_certs",
                    source=root_certs_dir,
                    type="bind",
                    read_only=True),
              Mount(target="/runtime/output",
                    source=container_runtime_dir,
                    type="bind"),
              Mount(target="/runtime/network",
                    source=network_runtime_dir,
                    type="bind",
                    read_only=True),
              Mount(target="/runtime/device/startup.pcap",
                    source=device_startup_capture,
                    type="bind",
                    read_only=True),
              Mount(target="/runtime/device/monitor.pcap",
                    source=device_monitor_capture,
                    type="bind",
                    read_only=True)
          ],
          environment={
              "TZ": self.get_session().get_timezone(),
              "HOST_USER": self._host_user,
              "DEVICE_MAC": device.mac_addr,
              "IPV4_ADDR": device.ip_addr,
              "DEVICE_TEST_MODULES": json.dumps(device.test_modules),
              "IPV4_SUBNET": self._net_orc.network_config.ipv4_network,
              "IPV6_SUBNET": self._net_orc.network_config.ipv6_network
          })
    except (docker.errors.APIError,
            docker.errors.ContainerError) as container_error:
      LOGGER.error("Test module " + module.name + " has failed to start")
      LOGGER.debug(container_error)
      return

    # Mount the test container to the virtual network if requried
    if module.network:
      LOGGER.debug("Attaching test module to the network")
      self._net_orc.attach_test_module_to_network(module)

    # Determine the module timeout time
    test_module_timeout = time.time() + module.timeout
    status = self._get_module_status(module)

    # Resolving container logs is blocking so we need to spawn a new thread
    log_stream = module.container.logs(stream=True, stdout=True, stderr=True)
    log_thread = threading.Thread(target=self._get_container_logs,
                                  args=(log_stream, ))
    log_thread.daemon = True
    log_thread.start()

    while (status == "running" and self._session.get_status() == "In Progress"):
      if time.time() > test_module_timeout:
        LOGGER.error("Module timeout exceeded, killing module: " + module.name)
        self._stop_module(module=module, kill=True)
        break
      status = self._get_module_status(module)

    # Save all container logs to file
    with open(container_log_file, "w", encoding="utf-8") as f:
      for line in self._container_logs:
        f.write(line + "\n")

    # Check that Testrun has not been stopped whilst this module was running
    if self.get_session().get_status() == "Stopping":
      # Discard results for this module
      LOGGER.info(f"Test module {module.name} has forcefully quit")
      return

    # Get test results from module
    container_runtime_dir = os.path.join(
        self._root_path,
        "runtime/test/" + device.mac_addr.replace(":", "") + "/" + module.name)
    results_file = f"{container_runtime_dir}/{module.name}-result.json"

    try:
      with open(results_file, "r", encoding="utf-8-sig") as f:

        # Load results from JSON file
        module_results_json = json.load(f)
        module_results = module_results_json["results"]
        for test_result in module_results:

          # Convert dict from json into TestCase object
          test_case = TestCase(
            name=test_result["name"],
            description=test_result["description"],
            expected_behavior=test_result["expected_behavior"],
            required_result=test_result["required_result"],
            result=test_result["result"])

          # Any informational test should always report informational
          if test_case.required_result == "Informational":
            test_case.result = "Informational"

          # Add steps to resolve if test is non-compliant
          if (test_case.result == "Non-Compliant" and
              "recommendations" in test_result):
            test_case.recommendations = test_result["recommendations"]
          else:
            test_case.recommendations = None

          self._session.add_test_result(test_case)

    except (FileNotFoundError, PermissionError,
            json.JSONDecodeError) as results_error:
      LOGGER.error(
        f"Error occurred whilst obtaining results for module {module.name}")
      LOGGER.error(results_error)

    # Get the markdown report from the module if generated
    markdown_file = f"{container_runtime_dir}/{module.name}_report.md"
    try:
      with open(markdown_file, "r", encoding="utf-8") as f:
        module_report = f.read()
        self._session.add_module_report(module_report)
    except (FileNotFoundError, PermissionError):
      LOGGER.debug("Test module did not produce a markdown module report")

    # Get the HTML report from the module if generated
    html_file = f"{container_runtime_dir}/{module.name}_report.html"
    try:
      with open(html_file, "r", encoding="utf-8") as f:
        module_report = f.read()
        LOGGER.debug(f"Adding module report for module {module.name}")
        self._session.add_module_report(module_report)
    except (FileNotFoundError, PermissionError):
      LOGGER.debug("Test module did not produce a html module report")

    LOGGER.info(f"Test module {module.name} has finished")

  # Resolve all current log data in the containers log_stream
  # this method is blocking so should be called in
  # a thread or within a proper blocking context
  def _get_container_logs(self, log_stream):
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

  def _load_test_modules(self):
    """Load network modules from module_config.json."""
    LOGGER.debug("Loading test modules from /" + TEST_MODULES_DIR)

    loaded_modules = "Loaded the following test modules: "
    test_modules_dir = os.path.join(self._path, TEST_MODULES_DIR)

    module_dirs = os.listdir(test_modules_dir)
    # Check if the directory protocol exists and move it to the beginning
    # protocol should always be run first so BACnet binding doesn't get
    # corrupted during DHCP changes in the conn module
    if "protocol" in module_dirs:
      module_dirs.insert(0, module_dirs.pop(module_dirs.index("protocol")))

    for module_dir in module_dirs:

      if self._get_test_module(module_dir) is None:
        loaded_module = self._load_test_module(module_dir)
        loaded_modules += loaded_module.dir_name + " "

    LOGGER.info(loaded_modules)

  def _load_test_module(self, module_dir):
    """Import module configuration from module_config.json."""

    LOGGER.debug(f"Loading test module {module_dir}")

    modules_dir = os.path.join(self._path, TEST_MODULES_DIR)

    # Load basic module information
    module = TestModule()
    with open(os.path.join(self._path, modules_dir, module_dir, MODULE_CONFIG),
              encoding="UTF-8") as module_config_file:
      module_json = json.load(module_config_file)

    module.name = module_json["config"]["meta"]["name"]
    module.display_name = module_json["config"]["meta"]["display_name"]
    module.description = module_json["config"]["meta"]["description"]

    if "enabled" in module_json["config"]:
      module.enabled = module_json["config"]["enabled"]

    module.dir = os.path.join(self._path, modules_dir, module_dir)
    module.dir_name = module_dir
    module.build_file = module_dir + ".Dockerfile"
    module.container_name = "tr-ct-" + module.dir_name + "-test"
    module.image_name = "test-run/" + module.dir_name + "-test"

    # Load test cases
    if "tests" in module_json["config"]:
      module.total_tests = len(module_json["config"]["tests"])
      for test_case_json in module_json["config"]["tests"]:
        try:
          test_case = TestCase(
            name=test_case_json["name"],
            description=test_case_json["test_description"],
            expected_behavior=test_case_json["expected_behavior"],
            required_result=test_case_json["required_result"]
          )

          if "recommendations" in test_case_json:
            test_case.recommendations = test_case_json["recommendations"]
          module.tests.append(test_case)
        except Exception as error:  # pylint: disable=W0718
          LOGGER.error("Failed to load test case. See error for details")
          LOGGER.error(error)

    if "timeout" in module_json["config"]["docker"]:
      module.timeout = module_json["config"]["docker"]["timeout"]

    # Determine if this is a container or just an image/template
    if "enable_container" in module_json["config"]["docker"]:
      module.enable_container = module_json["config"]["docker"][
          "enable_container"]

    # Determine if this module needs network access
    if "network" in module_json["config"]:
      module.network = module_json["config"]["network"]

    # Ensure container is built after any dependencies
    if "depends_on" in module_json["config"]["docker"]:
      depends_on_module = module_json["config"]["docker"]["depends_on"]
      if self._get_test_module(depends_on_module) is None:
        self._load_test_module(depends_on_module)

    self._test_modules.append(module)
    return module

  def build_test_modules(self):
    """Build all test modules."""
    LOGGER.info("Building test modules...")
    for module in self._test_modules:
      self._build_test_module(module)

  def _build_test_module(self, module):
    LOGGER.debug("Building docker image for module " + module.dir_name)

    client = docker.from_env()
    try:
      client.images.build(
          dockerfile=os.path.join(module.dir, module.build_file),
          path=self._path,
          forcerm=True,  # Cleans up intermediate containers during build
          tag=module.image_name)
    except docker.errors.BuildError as error:
      LOGGER.error(error)

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
    try:
      container = module.container
      if container is not None:
        if kill:
          LOGGER.debug("Killing container:" + module.container_name)
          container.kill()
        else:
          LOGGER.debug("Stopping container:" + module.container_name)
          container.stop()
        LOGGER.debug("Container stopped:" + module.container_name)
    except docker.errors.NotFound:
      pass

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
          self._test_modules_running[i].tests[j]
          )

