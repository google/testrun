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

"""Test assertions for CI network baseline test"""
# pylint: disable=redefined-outer-name

from collections.abc import Callable
import json
import os
import re
import shutil
import signal
import subprocess
import time
import pytest
import requests
from cryptography import x509
from cryptography.hazmat.backends import default_backend

API = "http://127.0.0.1:8000"
LOG_PATH = "/tmp/testrun.log"
TEST_SITE_DIR = ".."

DEVICES_DIRECTORY = "local/devices"
TESTING_DEVICES = "../devices"
PROFILES_DIRECTORY = "local/risk_profiles"
SYS_CONFIG_FILE = "local/system.json"
CERTS_DIRECTORY = "local/root_certs"

SYS_CONFIG_PATH = "testing/api/sys_config"
CERTS_PATH = "testing/api/certificates"
PROFILES_PATH = "testing/api/profiles"
REPORTS_PATH = "testing/api/reports"
DEVICES_PATH = "testing/api/devices"
DEVICE_1_PATH = "testing/api/devices/device_1"
DEVICE_2_PATH = "testing/api/devices/device_2"


BASELINE_MAC_ADDR = "02:42:aa:00:01:01"
ALL_MAC_ADDR = "02:42:aa:00:00:01"

DEVICE_PROFILE_QUESTIONS = "resources/devices/device_profile.json"

def pretty_print(dictionary: dict):
  """ Pretty print dictionary """
  print(json.dumps(dictionary, indent=4))

def query_system_status():
  """ Query system/status endpoint and returns 'status' value """

  # Send the get request
  r = requests.get(f"{API}/system/status", timeout=5)

  # Parse the json response
  response = r.json()

  # Return the system status
  return response["status"]

def query_test_count() -> int:
  """ Queries status and returns number of test results """
  r = requests.get(f"{API}/system/status", timeout=5)
  response = r.json()
  return len(response["tests"]["results"])

@pytest.fixture
def testing_devices():
  """ Use devices from the testing/devices directory """
  delete_all_devices()
  shutil.copytree(
      os.path.join(os.path.dirname(__file__), TESTING_DEVICES),
      os.path.join(DEVICES_DIRECTORY),
      dirs_exist_ok=True,
  )
  return get_all_devices()

def start_test_device(
    device_name, mac_addr, image_name="test-run/ci_device_1", args=""
):
  """ Start test device container with given name """
  cmd = subprocess.run(
      f"docker run -d --network=endev0 --mac-address={mac_addr}"
      f" --cap-add=NET_ADMIN -v /tmp:/out --privileged --name={device_name}"
      f" {image_name} {args}",
      shell=True,
      check=True,
      capture_output=True,
  )
  print(cmd.stdout)

def stop_test_device(device_name):
  """ Stop docker container with given name """
  cmd = subprocess.run(
      f"docker stop {device_name}", shell=True, capture_output=True,
      check=False
  )
  print(cmd.stdout)
  cmd = subprocess.run(
      f"docker rm {device_name}", shell=True, capture_output=True,
      check=False
  )
  print(cmd.stdout)

def docker_logs(device_name):
  """ Print docker logs from given docker container name """
  cmd = subprocess.run(
      f"docker logs {device_name}", shell=True, capture_output=True,
      check=False
  )
  print(cmd.stdout)

def load_json(file_name, directory):
  """ Utility method to load json files """

  # Construct the base path relative to the main folder
  base_path = os.path.abspath(os.path.join(__file__, "../../.."))

  # Construct the full file path
  file_path = os.path.join(base_path, directory, file_name)

  # Open the file in read mode
  with open(file_path, "r", encoding="utf-8") as file:

    # Return the file content
    return json.load(file)

@pytest.fixture
def testrun(request): # pylint: disable=W0613
  """ Start instance of testrun """

  # Launch the Testrun in a new process group
  # pylint: disable=W1509
  with subprocess.Popen(
      "bin/testrun",
      stdout=subprocess.PIPE,
      stderr=subprocess.STDOUT,
      encoding="utf-8",
      preexec_fn=os.setsid
  ) as proc:

    # Wait until the API is ready to accept requests or timeout
    while True:

      try:

        # Capture the process output
        outs = proc.communicate(timeout=1)[0]

      except subprocess.TimeoutExpired as e:

        # If output is captured during timeout, decode and check
        if e.output is not None:
          output = e.output.decode("utf-8")

          # Check if the output contains the message indicating the API is ready
          if re.search("API waiting for requests", output):
            break

      except Exception:
        # Fail if the Testrun process unexpectedly terminates
        pytest.fail("Testrun terminated")

    # Wait for two seconds before yielding
    time.sleep(2)

    yield

    # Terminate the Testrun process group
    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    try:

      # Wait up to 60 seconds for clean termination of the Testrun process
      outs = proc.communicate(timeout=60)[0]

    # If termination exceeds the timeout, force to kill the process
    except subprocess.TimeoutExpired as e:
      print(e.output)
      os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
      pytest.exit(
          "Waited 60s but Testrun did not cleanly exit .. terminating all tests"
      )

  print(outs)

  # Stop any remaining Docker containers after the test
  cmd = subprocess.run(
      "docker stop $(docker ps -a -q)", shell=True,
      capture_output=True, check=False
  )

  print(cmd.stdout)

  # Remove the stopped Docker containers
  cmd = subprocess.run(
      "docker rm  $(docker ps -a -q)", shell=True,
      capture_output=True, check=False
  )

  print(cmd.stdout)

def until_true(func: Callable, message: str, timeout: int):
  """ Blocks until given func returns True

  Raises:
    Exception if timeout has elapsed
  """
  expiry_time = time.time() + timeout
  while time.time() < expiry_time:
    if func():
      return True
    time.sleep(1)
  raise TimeoutError(f"Timed out waiting {timeout}s for {message}")

def dict_paths(thing: dict, stem: str = ""):
  """ Returns json paths (in dot notation) from a given dictionary """
  for k, v in thing.items():
    path = f"{stem}.{k}" if stem else k
    if isinstance(v, dict):
      yield from dict_paths(v, path)
    else:
      yield path

def get_network_interfaces() -> str:
  """ Return list of network interfaces on machine

  Uses /sys/class/net rather than interfaces as testrun uses the latter
  """
  # Initialise empty list
  ifaces = []

  # Path to the directory containing network interfaces
  path = "/sys/class/net"

  # Iterate over the items in the directory
  for item in os.listdir(path):

    # Construct the full path
    full_path = os.path.join(path, item)

    # Skip if the item is not a directory
    if not os.path.isdir(full_path):
      continue

    # Check if the interface name starts with 'en' or 'eth'
    if item.startswith("en") or item.startswith("eth"):
      ifaces.append(item)

  # Return the list of network interfaces
  return ifaces

def test_invalid_api_path(testrun): # pylint: disable=W0613
  """ Test for invalid API path (404)"""

  # Send the get request to the invalid path
  r = requests.get(f"{API}/non-existing", timeout=5)

  # Check that the response status code is 404 (Not Found)
  assert r.status_code == 404

# Tests for system endpoints

@pytest.fixture()
def restore_sys_config():
  """ Restore the original system configuration (system.json) after the test """

  yield

  # Construct the full path for 'system.json'
  sys_config = os.path.join(SYS_CONFIG_PATH, "system.json")

  # Restore system.json from 'testing/api/sys_config' after the test
  if os.path.exists(sys_config):

    shutil.copy(sys_config, SYS_CONFIG_FILE)

@pytest.fixture()
def update_sys_config():
  """ Update the system configuration (system.json) before the test """

  # Construct the full path for 'updated_system.json'
  updated_sys_config = os.path.join(SYS_CONFIG_PATH, "updated_system.json")

  # Restore system.json from 'testing/api/sys_config' after the test
  if os.path.exists(updated_sys_config):

    shutil.copy(updated_sys_config, SYS_CONFIG_FILE)

def test_get_sys_interfaces(testrun): # pylint: disable=W0613
  """ Tests API system interfaces against actual local interfaces (200) """

  # Send a GET request to the API to retrieve system interfaces
  r = requests.get(f"{API}/system/interfaces", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Retrieve the actual network interfaces
  local_interfaces = get_network_interfaces()

  # Check if the key are in the response
  assert set(response.keys()) == set(local_interfaces)

  # Ensure that all values in the response are strings
  assert all(isinstance(x, str) for x in response)

def test_update_sys_config(testrun, restore_sys_config): # pylint: disable=W0613
  """ Test update system configuration endpoint (200) """

  # Load the updated system configuration
  updated_sys_config = load_json("updated_system.json",
                                 directory=SYS_CONFIG_PATH)

  # Assign the values of 'device_intf' and 'internet_intf' from payload
  updated_device_intf = updated_sys_config["network"]["device_intf"]
  updated_internet_intf = updated_sys_config["network"]["internet_intf"]

  # Send the post request to update the system configuration
  r = requests.post(f"{API}/system/config",
                    data=json.dumps(updated_sys_config),
                    timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Load 'system.json' from 'local' folder
  local_sys_config = load_json("system.json", directory="local")

  # Assign 'device_intf' and 'internet_intf' values from 'local/system.json'
  local_device_intf = local_sys_config["network"]["device_intf"]
  local_internet_intf = local_sys_config["network"]["internet_intf"]

  # Check if 'device_intf' has been updated
  assert updated_device_intf == local_device_intf

  # Check if 'internet_intf' has been updated
  assert updated_internet_intf == local_internet_intf

def test_update_sys_config_invalid_json(testrun): # pylint: disable=W0613
  """ Test invalid payload for update system configuration (400) """

  # Empty payload
  updated_system_config = {}

  # Send the post request to update the system configuration
  r = requests.post(f"{API}/system/config",
                    data=json.dumps(updated_system_config),
                    timeout=5)

  # Check if status code is 400 (Invalid config)
  assert r.status_code == 400

def test_get_sys_config(testrun): # pylint: disable=W0613
  """ Tests get system configuration endpoint (200) """

  # Send a GET request to the API to retrieve system configuration
  r = requests.get(f"{API}/system/config", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  api_sys_config = r.json()

  # Assign the json response keys and expected types
  expected_keys = {
    "network": dict,
    "log_level": str, 
    "startup_timeout": int, 
    "monitor_period": int,
    "max_device_reports": int,
    "api_url": str,
    "api_port": int,
    "org_name": str,
  }

  # Iterate over the dict keys and values
  for key, key_type in expected_keys.items():

    # Check if the key is in the JSON response
    assert key in api_sys_config

    # Check if the key has the expected data type
    assert isinstance(api_sys_config[key], key_type)

  # Load the local system configuration file 'local/system.json'
  local_sys_config = load_json("system.json", directory="local")

  # Assign 'device_intf' and 'internet_intf' values from 'local/system.json'
  local_device_intf = local_sys_config["network"]["device_intf"]
  local_internet_intf = local_sys_config["network"]["internet_intf"]

  # Assign 'device_intf' and 'internet_intf' values from the api response
  api_device_intf = api_sys_config["network"]["device_intf"]
  api_internet_intf = api_sys_config["network"]["internet_intf"]

  # Check if the device interface in the local config matches the API config
  assert api_device_intf == local_device_intf

  # Check if the internet interface in the local config matches the API config
  assert api_internet_intf == local_internet_intf

@pytest.fixture()
def start_test():
  """ Starts a testrun test using the API """  

  # Load the device (payload) using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the mac address
  mac_addr = device["mac_addr"]

  # Assign the test modules
  test_modules = device["test_modules"]

  # Payload with device details
  payload = {
    "device": {
      "mac_addr": mac_addr,
      "firmware": "test",
      "test_modules": test_modules
    }
  }

  # Send the post request (start test)
  r = requests.post(f"{API}/system/start",
                    data=json.dumps(payload),
                    timeout=10)

  # Exception if status code is not 200
  if r.status_code != 200:
    raise ValueError(f"API request failed with code: {r.status_code}")

@pytest.fixture()
def stop_test():
  """ Stops a testrun test using the API """ 

  # Send the post request to stop the test
  r = requests.post(f"{API}/system/stop", timeout=10)

  # Exception if status code is not 200
  if r.status_code != 200:
    raise ValueError(f"API request failed with code: {r.status_code}")

  # Validate system status

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_start_testrun_success(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """ Test for testrun started successfully (200) """

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device mac address
  mac_addr = device["mac_addr"]

  # Assign device modules
  test_modules = device["test_modules"]

  # Payload with device details
  payload = {
    "device": {
      "mac_addr": mac_addr,
      "firmware": "test",
      "test_modules": test_modules
    }
  }

  # Send the post request
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Check if the response status code is 200 (OK)
  assert r.status_code == 200

  # Parse the json response
  response = r.json()

  # Check that device is in response
  assert "device" in response

  # Assign the json response keys and expected types
  expected_keys = {
    "mac_addr": str,
    "firmware": str,
    "test_modules": dict
  }

  # Assign the device properties
  device = response["device"]

  # Iterate over the 'expected_keys' dict keys and values
  for key, key_type in expected_keys.items():

    # Check if the key is in the device
    assert key in device

    # Check if the key has the expected data type
    assert isinstance(device[key], key_type)

def test_start_testrun_invalid_json(testrun): # pylint: disable=W0613
  """ Test for invalid JSON payload when testrun is started (400) """

  # Payload empty dict (no device)
  payload = {}

  # Send the post request
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Check if the response status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_start_testrun_already_started(empty_devices_dir, add_devices, # pylint: disable=W0613
                                                    testrun, start_test): # pylint: disable=W0613
  """ Test for testrun already started (409) """

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device mac address
  mac_addr = device["mac_addr"]

  # Assign the test modules
  test_modules = device["test_modules"]

  # Payload with device details
  payload = {
    "device": {
      "mac_addr": mac_addr,
      "firmware": "test",
      "test_modules": test_modules
    }
  }

  # Send the post request (start test)
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Parse the json response
  response = r.json()

  # Check if the response status code is 409 (Conflict)
  assert r.status_code == 409

  # Check if 'error' in response
  assert "error" in response

def test_start_testrun_device_not_found(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for start testrun when device is not found (404) """

  # Payload with device details with no mac address assigned
  payload = {"device": {
    "mac_addr": "",
    "firmware": "test",
    "test_modules": {}
    }}

  # Send the post request
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Check if the response status code is 404 (not found)
  assert r.status_code == 404

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_start_testrun_error(empty_devices_dir, add_devices, # pylint: disable=W0613
               update_sys_config, testrun, restore_sys_config): # pylint: disable=W0613
  """ Test for start testrun internal server error (500) """

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the mac address
  mac_addr = device["mac_addr"]

  # Assign the test modules
  test_modules = device["test_modules"]

  # Payload with device details
  payload = { "device":
                {
                "mac_addr": mac_addr,
                "firmware": "test",
                "test_modules": test_modules
                }
            }

  # Send the post request
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Parse the json response
  response = r.json()

  # Check if the response status code is 500
  assert r.status_code == 500

  # Check if 'error' in response
  assert "error" in response

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_stop_running_testrun(empty_devices_dir, add_devices, # pylint: disable=W0613
                                        testrun, start_test): # pylint: disable=W0613
  """ Test for successfully stop testrun when test is running (200) """

  # Send the post request to stop the test
  r = requests.post(f"{API}/system/stop", timeout=10)

  # Parse the json response
  response = r.json()

  # Check if status code is 200 (ok)
  assert r.status_code == 200

  # Check if error in response
  assert "success" in response

def test_stop_testrun_not_running(testrun): # pylint: disable=W0613
  """ Test for stop testrun when is not running (404) """

  # Send the post request to stop the test
  r = requests.post(f"{API}/system/stop", timeout=10)

  # Parse the json response
  response = r.json()

  # Check if status code is 404 (not found)
  assert r.status_code == 404

  # Check if error in response
  assert "error" in response

def test_sys_shutdown(testrun): # pylint: disable=W0613
  """ Test for testrun shutdown endpoint (200) """

  # Send a POST request to initiate the system shutdown
  r = requests.post(f"{API}/system/shutdown", timeout=5)

  # Parse the json response
  response = r.json()

  # Check if the response status code is 200 (OK)
  assert r.status_code == 200

  # Check if null in response
  assert response is None

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_sys_shutdown_in_progress(empty_devices_dir, add_devices, # pylint: disable=W0613
                                            testrun, start_test): # pylint: disable=W0613
  """ Test system shutdown during an in-progress test (400) """

  # Attempt to shutdown while the test is running
  r = requests.post(f"{API}/system/shutdown", timeout=5)

  # Check if the response status code is 400 (test in progress)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

def test_sys_status_idle(testrun): # pylint: disable=W0613
  """ Test for system status 'Idle' (200) """

  # Send the get request
  r = requests.get(f"{API}/system/status", timeout=5)

  # Check if the response status code is 200 (OK)
  assert r.status_code == 200

  # Parse the json response
  response = r.json()

  # Check if system status is 'Idle'
  assert response["status"] == "Idle"

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_sys_status_cancelled(empty_devices_dir, add_devices, # pylint: disable=W0613
                             testrun, start_test, stop_test): # pylint: disable=W0613
  """ Test for system status 'cancelled' (200) """

  # Send the get request to retrieve system status
  r = requests.get(f"{API}/system/status", timeout=5)

  # Parse the json response
  response = r.json()

  # Check if status is 'Cancelled'
  assert response["status"] == "Cancelled"

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_sys_status_starting(empty_devices_dir, add_devices, # pylint: disable=W0613
                                       testrun, start_test): # pylint: disable=W0613
  """ Test for system status 'Starting' and 'Waiting for Device' (200) """

  # Send the get request
  r = requests.get(f"{API}/system/status", timeout=5)

  # Check if the response status code is 200 (OK)
  assert r.status_code == 200

  # Parse the json response
  response = r.json()

  # Check if system status is 'Starting'
  assert response["status"] == "Starting"

  # Add max 60 seconds delay to allow for status to change
  max_retries = 60

  # If status is "Starting" and max_retries didn't reach 0
  while response["status"] == "Starting" and max_retries != 0:

    # Add 1 second delay
    time.sleep(1)

    # Subtract 1 from max_retries
    max_retries -= 1

    # Resend the get request
    r = requests.get(f"{API}/system/status", timeout=5)

    # Parse the json response
    response = r.json()

  # Check if system status is 'Waiting for Device'
  assert response["status"] == "Waiting for Device"

def test_system_version(testrun): # pylint: disable=W0613
  """Test for testrun version endpoint"""

  # Send the get request to the API
  r = requests.get(f"{API}/system/version", timeout=5)

  # Check if status code is 200 (ok)
  assert r.status_code == 200

  # Parse the response
  response = r.json()

  # Assign the expected json response keys and expected types
  expected_keys = {
    "installed_version": str,
    "update_available": bool, 
    "latest_version": str, 
    "latest_version_url": str
  }

  # Iterate over the dict keys and values
  for key, key_type in expected_keys.items():

    # Check if the key is in the JSON response
    assert key in response

    # Check if the key has the expected data type
    assert isinstance(response[key], key_type)

def test_get_test_modules(testrun): # pylint: disable=W0613
  """ Test the /system/modules endpoint to get the test modules (200) """

  # Send a GET request to the API endpoint
  r = requests.get(f"{API}/system/modules", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Check if the response is a list
  assert isinstance(response, list)

# Tests for reports endpoints

def get_timestamp(formatted=False):
  """ Returns timestamp value from 'started' field from the report
      found at 'testing/api/reports/report.json'
      By default it will return the raw time format or iso if formatted=True
  """

  # Load the report.json using load_json utility method
  report_json = load_json("report.json", directory="testing/api/reports")

  # Assign the timestamp from report.json
  timestamp = report_json["started"]

  # If formatted is changed to 'True'
  if formatted:

    # Return the iso formatted timestamp
    return timestamp.replace(" ", "T")

  # Else return the raw timestamp
  return timestamp

@pytest.fixture
def create_report_folder(): # pylint: disable=W0613
  """ Fixture to create the device reports folder in local/devices """

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device mac address
  mac_addr = device["mac_addr"]

  # Assign the device name
  device_name = f'{device["manufacturer"]} {device["model"]}'

  # Create the device folder path
  main_folder = os.path.join(DEVICES_DIRECTORY, device_name)

  # Remove the ":" from mac address for the folder structure
  mac_addr = mac_addr.replace(":", "")

  # Assign the timestamp from get_timestamp utility method
  timestamp = get_timestamp(formatted=True)

  # Create the report folder path
  report_folder = os.path.join(main_folder, "reports", timestamp,
                                "test", mac_addr)

  # Ensure the report folder exists
  os.makedirs(report_folder, exist_ok=True)

  # Iterate over the files from 'testing/api/reports' folder
  for file in os.listdir(REPORTS_PATH):

    # Construct full path of the file from 'testing/api/reports' folder
    source_path = os.path.join(REPORTS_PATH, file)

    # Construct full path where the file will be copied
    target_path = os.path.join(report_folder, file)

    # Copy the file
    shutil.copy(source_path, target_path)

def test_get_reports_no_reports(empty_devices_dir, testrun): # pylint: disable=W0613
  """Test get reports when no reports exist"""

  # Set the Origin headers to API address
  headers = {
        "Origin": API 
    }

  # Send a GET request to the /reports endpoint
  r = requests.get(f"{API}/reports", headers=headers, timeout=5)

  # Check if the status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Check if the response is a list
  assert isinstance(response, list)

  # Check if the response is an empty list
  assert response == []

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_get_reports(empty_devices_dir, add_devices, # pylint: disable=W0613
                     create_report_folder, testrun): # pylint: disable=W0613
  """ Test for get reports when one report is available (200) """

  # Set the Origin headers to API address
  headers = {
        "Origin": API 
    }

  # Get request to retrieve the generated reports
  r = requests.get(f"{API}/reports", headers=headers, timeout=5)

  # Parse the json
  response = r.json()

  # Check if status code is 200 (ok)
  assert r.status_code == 200

  # Check if response is a list
  assert isinstance(response, list)

  # Check if there is one report
  assert len(response) == 1

  # Assign the report from the response list
  report = response[0]

  # Assign the expected report properties
  expected_keys = [
    "testrun",
    "mac_addr",
    "device",
    "status",
    "started",
    "finished",
    "tests",
    "report",
    "export"
  ]

  # Iterate through the expected_keys
  for key in expected_keys:

    # Check if the key exists in the report
    assert key in report

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_delete_report(empty_devices_dir, add_devices, # pylint: disable=W0613
                       create_report_folder, testrun): # pylint: disable=W0613
  """ Test for succesfully delete a report (200) """

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device mac address
  mac_addr = device["mac_addr"]

  # Assign the device name
  device_name = f'{device["manufacturer"]} {device["model"]}'

  # Payload
  delete_data = {
    "mac_addr": mac_addr,
    "timestamp": get_timestamp()
  }

  # Send a DELETE request to remove the report
  r = requests.delete(f"{API}/report", data=json.dumps(delete_data), timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the json response
  response = r.json()

  # Check if "success" in response
  assert "success" in response

  # Construct the 'reports' folder path
  reports_folder = os.path.join(device_name, "reports")

  # Check if reports folder has been deleted
  assert not os.path.exists(reports_folder)

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_delete_report_no_payload(empty_devices_dir, add_devices, # pylint: disable=W0613
                                  create_report_folder, testrun): # pylint: disable=W0613
  """ Test delete report bad request when the payload is missing (400) """

  # Send a DELETE request to remove the report without the payload
  r = requests.delete(f"{API}/report", timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  assert "Invalid request received, missing body" in response["error"]

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_delete_report_invalid_payload(empty_devices_dir, add_devices, # pylint: disable=W0613
                                       create_report_folder, testrun): # pylint: disable=W0613
  """ Test delete report bad request missing mac addr or timestamp (400) """

  # Empty payload
  delete_data = {}

  # Send a DELETE request to remove the report
  r = requests.delete(f"{API}/report", data=json.dumps(delete_data), timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  assert "Missing mac address or timestamp" in response["error"]

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_delete_report_invalid_timestamp(empty_devices_dir, add_devices, # pylint: disable=W0613
                                         create_report_folder, testrun): # pylint: disable=W0613
  """ Test delete report bad request if timestamp format is not valid (400) """

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device mac address
  mac_addr = device["mac_addr"]

  # Assign the incorrect timestamp format
  invalid_timestamp = "2024-01-01 invalid"

  # Payload
  delete_data = {
    "mac_addr": mac_addr,
    "timestamp": invalid_timestamp
  }

  # Send a DELETE request to remove the report
  r = requests.delete(f"{API}/report", data=json.dumps(delete_data), timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  assert "Incorrect timestamp format" in response["error"]

def test_delete_report_no_device(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test delete report when device does not exist (404) """

  # Payload to be deleted for a non existing device
  delete_data = {
      "mac_addr": "00:1e:42:35:73:c4",
      "timestamp": get_timestamp()
  }

  # Send the delete request to the endpoint
  r = requests.delete(f"{API}/report", data=json.dumps(delete_data), timeout=5)

  # Check if status is 404 (not found)
  assert r.status_code == 404

  # Parse the response json
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  assert "Could not find device" in response["error"]

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_delete_report_no_report(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """Test for delete report when report does not exist (404)"""

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device mac address
  mac_addr = device["mac_addr"]

  # Prepare the payload for the DELETE request
  delete_data = {
      "mac_addr": mac_addr,
      "timestamp": get_timestamp()
  }

  # Send the delete request to delete the report
  r = requests.delete(f"{API}/report",
                      data=json.dumps(delete_data),
                      timeout=5)

  # Check if status code is 404 (not found)
  assert r.status_code == 404

  # Parse the JSON response
  response = r.json()

  # Check if error is present in the response
  assert "error" in response

  # Check if the correct error message is returned
  assert "Report not found" in response["error"]

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_get_report_success(empty_devices_dir, add_devices, # pylint: disable=W0613
                            create_report_folder, testrun): # pylint: disable=W0613
  """Test for successfully get report when report exists (200)"""

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device name
  device_name = f'{device["manufacturer"]} {device["model"]}'

  # Assign the timestamp and change the format
  timestamp = get_timestamp(formatted=True)

  # Send the get request
  r = requests.get(f"{API}/report/{device_name}/{timestamp}", timeout=5)

  # Check if status code is 200 (ok)
  assert r.status_code == 200

  # Check if the response is a PDF
  assert r.headers["Content-Type"] == "application/pdf"

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_get_report_not_found(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """Test get report when report doesn't exist (404)"""

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device name
  device_name = f'{device["manufacturer"]} {device["model"]}'

  # Assign the timestamp
  timestamp = get_timestamp()

  # Send the get request
  r = requests.get(f"{API}/report/{device_name}/{timestamp}", timeout=5)

  # Check if status code is 404 (not found)
  assert r.status_code == 404

  # Parse the response json
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  assert "Report could not be found" in response["error"]

def test_get_report_device_not_found(empty_devices_dir, testrun): # pylint: disable=W0613
  """Test getting a report when the device is not found (404)"""

  # Assign device name
  device_name = "nonexistent_device"

  # Assign the timestamp
  timestamp = get_timestamp()

  # Send the get request
  r = requests.get(f"{API}/report/{device_name}/{timestamp}", timeout=5)

  # Check if is 404 (not found)
  assert r.status_code == 404

  # Parse the json response
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message is returned
  assert "Device not found" in response["error"]

def test_export_report_device_not_found(empty_devices_dir, create_report_folder, # pylint: disable=W0613
                                                                       testrun): # pylint: disable=W0613
  """Test for export the report result when the device could not be found"""

  # Assign the non-existing device name
  device_name = "non existing device"

  # Assign the timestamp
  timestamp = get_timestamp()

  # Send the post request
  r = requests.post(f"{API}/export/{device_name}/{timestamp}", timeout=5)

  # Check if is 404 (not found)
  assert r.status_code == 404

  # Parse the json response
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  assert "A device with that name could not be found" in response["error"]

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_export_report_profile_not_found(empty_devices_dir, add_devices, # pylint: disable=W0613
                                         create_report_folder, testrun): # pylint: disable=W0613
  """Test for export report result when the profile is not found"""

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device name
  device_name = f'{device["manufacturer"]} {device["model"]}'

  # Assign the timestamp
  timestamp = get_timestamp()

  # Add a non existing profile into the payload
  payload = {"profile": "non_existent_profile"}

  # Send the post request
  r = requests.post(f"{API}/export/{device_name}/{timestamp}",
                    json=payload,
                    timeout=5)

  # Check if is 404 (not found)
  assert r.status_code == 404

  # Parse the json response
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  assert "A profile with that name could not be found" in response["error"]

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_export_report_not_found(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """Test for export the report result when the report could not be found"""

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device name
  device_name = f'{device["manufacturer"]} {device["model"]}'

  # Assign the timestamp
  timestamp = get_timestamp()

  # Send the post request to trigger the zipping process
  r = requests.post(f"{API}/export/{device_name}/{timestamp}", timeout=10)

  # Check if status code is 404 (Not Found)
  assert r.status_code == 404

  # Parse the json response
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message is returned
  assert "Report could not be found" in response["error"]

@pytest.mark.parametrize("add_devices, add_profiles", [
    (["device_1"], ["valid_profile.json"])
], indirect=True)
def test_export_report_with_profile(empty_devices_dir, add_devices, # pylint: disable=W0613
                                  empty_profiles_dir, add_profiles, # pylint: disable=W0613
                                    create_report_folder, testrun): # pylint: disable=W0613
  """Test export results with existing profile when report exists (200)"""

  # Load the profile using load_json utility method
  profile = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device name
  device_name = f'{device["manufacturer"]} {device["model"]}'

  # Assign the timestamp and change the format
  timestamp = get_timestamp(formatted=True)

  # Send the post request
  r = requests.post(f"{API}/export/{device_name}/{timestamp}",
                    json=profile,
                    timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Check if the response is a zip file
  assert r.headers["Content-Type"] == "application/zip"

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_export_results_with_no_profile(empty_devices_dir, add_devices, # pylint: disable=W0613
                                        create_report_folder, testrun): # pylint: disable=W0613
  """Test export results with no profile when report exists (200)"""

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device name
  device_name = f'{device["manufacturer"]} {device["model"]}'

  # Assign the timestamp and change the format
  timestamp = get_timestamp(formatted=True)

  # Send the post request
  r = requests.post(f"{API}/export/{device_name}/{timestamp}", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Check if the response is a zip file
  assert r.headers["Content-Type"] == "application/zip"

# Tests for device endpoints
@pytest.fixture()
def add_devices(request):
  """ Upload specified device to local/devices """

  # Access the parameter (devices list) provided to the fixture
  devices = request.param

  # Iterate over the device names provided
  for device in devices:

    # Construct the full path for the device_config.json
    device_path = os.path.join(DEVICES_PATH, device)

    # Load the device configurations using load_json utility method
    device = load_json("device_config.json", directory=device_path)

    # Assign the device name for the target directory
    target_device_name = f'{device["manufacturer"]} {device["model"]}'

    # Construct the source path of the device config file
    source_path = os.path.join(device_path, "device_config.json")

    # Construct the target path where the device config will be copied
    target_path = os.path.join(DEVICES_DIRECTORY, target_device_name)

    # Create the target directory if it doesn't exist
    os.makedirs(target_path, exist_ok=True)

    # Copy the device config from source to target
    shutil.copy(source_path, target_path)

  # Return the list with devices names
  return devices

def delete_all_devices():
  """Utility method to delete all devices from local/devices"""

  try:

    # Check if the device_path (local/devices) exists and is a folder
    if os.path.exists(DEVICES_DIRECTORY) and os.path.isdir(DEVICES_DIRECTORY):

      # Iterate over all devices from devices folder
      for item in os.listdir(DEVICES_DIRECTORY):

        # Create the full path
        item_path = os.path.join(DEVICES_DIRECTORY, item)

        # Check if item is a file
        if os.path.isfile(item_path):

          # Remove file
          os.unlink(item_path)

        else:

          # If item is a folder remove it
          shutil.rmtree(item_path)

  except PermissionError:

    # Permission related issues
    print(f"Permission Denied: {item}")

  except OSError as err:

    # System related issues
    print(f"Error removing {item}: {err}")

@pytest.fixture
def empty_devices_dir():
  """Delete all devices before and after test"""

  # Empty the directory before the test
  delete_all_devices()

  yield

  # Empty the directory after the test
  delete_all_devices()

def get_all_devices():
  """ Returns list with paths to all devices from local/devices """

  # List to store the paths of all 'device_config.json' files
  devices = []

  # Loop through each file/folder from 'local/devices'.
  for device_folder in os.listdir(DEVICES_DIRECTORY):

    # Construct the full path for the file/folder
    device_path = os.path.join(DEVICES_DIRECTORY, device_folder)

    # Check if the current path is a folder
    if os.path.isdir(device_path):

      # Construct the full path to 'device_config.json' inside the folder.
      config_path = os.path.join(device_path, "device_config.json")

      # Check if 'device_config.json' exists in the path.
      if os.path.exists(config_path):

        # Append the file path to the list.
        devices.append(config_path)

  # Return all the device_config.json paths
  return devices

def device_exists(device_mac):
  """ Utility method to check if device exists """

  # Send the get request
  r = requests.get(f"{API}/devices", timeout=5)

  # Check if status code is not 200 (OK)
  if r.status_code != 200:
    raise ValueError(f"Api request failed with code: {r.status_code}")

  # Parse the JSON response to get the list of devices
  devices = r.json()

  # Return if mac address is in the list of devices
  return any(p["mac_addr"] == device_mac for p in devices)

@pytest.mark.parametrize(
  "add_devices",
  [
    [],
    ["device_1"],
    ["device_1", "device_2"]
  ],
  indirect=True
)
def test_get_devices(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """ Test get devices when none, one or two devices are available (200) """

  # Send the get request to retrieve all devices
  r = requests.get(f"{API}/devices", timeout=5)

  # Check if status code is 200 (Ok)
  assert r.status_code == 200

  # Parse the json response
  response = r.json()

  # Check if response is a list
  assert isinstance(response, list)

  # Check if the number of devices matches the number of devices available
  assert len(response) == len(add_devices)

  # Assign the expected device fields
  expected_fields = [
    "status",
    "mac_addr",
    "manufacturer",
    "model",
    "type",
    "technology",
    "test_pack",
    "test_modules",
  ]

  # If devices are in the list
  if len(add_devices) > 0:

    # Iterate over all expected_fields list
    for field in expected_fields:

      # Check if devices have the expected fields
      assert all(field in device for device in response)

def test_create_device(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for successfully create device endpoint (201) """

  # Load the first device using load_json utility method
  device_1 = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the mac address for the first device
  mac_addr_1 = device_1["mac_addr"]

  # Send the post request to the '/device' endpoint
  r = requests.post(f"{API}/device", data=json.dumps(device_1), timeout=5)

  # Check if status code is 201 (Created)
  assert r.status_code == 201

  # Check if there is one device in 'local/devices'
  assert len(get_all_devices()) == 1

  # Load the second device using load_json utility method
  device_2 = load_json("device_config.json", directory=DEVICE_2_PATH)

  # Assign the mac address for the second device
  mac_addr_2 = device_2["mac_addr"]

  # Send the post request to the '/device' endpoint
  r = requests.post(f"{API}/device", data=json.dumps(device_2), timeout=5)

  # Check if status code is 201 (Created)
  assert r.status_code == 201

  # Check if there are two devices in 'local/devices'
  assert len(get_all_devices()) == 2

  # Send a get request to retrieve created devices
  r = requests.get(f"{API}/devices", timeout=5)

  # Parse the json response (devices)
  response = r.json()

  # Iterate through all the devices to find the device based on the "mac_addr"
  created_devices = [
    d for d in response
    if d["mac_addr"] in {mac_addr_1, mac_addr_2}
  ]

  # Check if both devices have been found
  assert len(created_devices) == 2

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_create_device_already_exists(empty_devices_dir, add_devices, # pylint: disable=W0613
                                                               testrun): # pylint: disable=W0613
  """ Test for crete device when device already exists (409) """

  # Error handling if there is not one devices in local/devices
  if len(get_all_devices()) != 1:
    raise Exception("Expected one device in local/devices")

  # Load the device (payload) using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Send the post request to create the device
  r = requests.post(f"{API}/device", data=json.dumps(device), timeout=5)

  # Check if status code is 409 (conflict)
  assert r.status_code == 409

  # Parse the json response (devices)
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

  # Check if 'local/device' has only one device
  assert len(get_all_devices()) == 1

def test_create_device_invalid_json(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for create device invalid json payload """

  # Error handling if there are devices in local/devices
  if len(get_all_devices()) != 0:
    raise Exception("Expected no device in local/devices")

  # Empty payload
  device = {}

  # Send the post request
  r = requests.post(f"{API}/device", data=json.dumps(device), timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response (devices)
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

  # Check if 'local/device' has no devices
  assert len(get_all_devices()) == 0

def test_create_device_invalid_request(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for create device when no payload is added """

  # Send the post request with no payload
  r = requests.post(f"{API}/device", data=None, timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response (devices)
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

  # Check if 'local/device' has no devices
  assert len(get_all_devices()) == 0

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_edit_device(empty_devices_dir, add_devices, # pylint: disable=W0613
                                           testrun): # pylint: disable=W0613
  """ Test for successfully edit device (200) """

  # Error handling if there is not one devices in local/devices
  if len(get_all_devices()) != 1:
    raise Exception("Expected one device in local/devices")

  # Load the device (payload) using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the mac address
  mac_addr = device["mac_addr"]

  # Update the manufacturer and model values
  device["manufacturer"] = "Updated Manufacturer"
  device["model"] = "Updated Model"

  # Payload with the updated device name
  updated_device = {
    "mac_addr": mac_addr,
    "device": device 
    }

  # Exception if the device is not found
  if not device_exists(mac_addr):
    raise ValueError(f"Device with mac address:{mac_addr} not found")

  # Send the post request to update the device
  r = requests.post(
      f"{API}/device/edit",
      data=json.dumps(updated_device),
      timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Check if 'local/device' still has only one device
  assert len(get_all_devices()) == 1

  # Send a get request to verify device update
  r = requests.get(f"{API}/devices", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response (devices list)
  response = r.json()

  # Iterate through the devices to find the device based on "mac_addr"
  updated_device = next(
    (d for d in response if d["mac_addr"] == mac_addr),
    None
  )

  # Error handling if the device is not being found
  if updated_device is None:
    raise Exception("The device could not be found")

  # Check if device "manufacturer" was updated
  assert device["manufacturer"] == updated_device["manufacturer"]

  # Check if device "manufacturer" was updated
  assert device["model"] == updated_device["model"]

def test_edit_device_not_found(empty_devices_dir, testrun): # pylint: disable=W0613

  """ Test for edit device when device is not found (404) """

  # Error handling if there are devices in local/devices
  if len(get_all_devices()) != 0:
    raise Exception("Expected no device in local/devices")

  # Load the device (payload) using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the mac address
  mac_addr = device["mac_addr"]

  # Update the manufacturer and model values
  device["manufacturer"] = "Updated manufacturer"
  device["model"] = "Updated model"

  # Payload with the updated device name
  updated_device = {
    "mac_addr": mac_addr,
    "device": device 
    }

  # Exception if the device is found
  if device_exists(mac_addr):
    raise ValueError(f"Device with mac address:{mac_addr} found")

  # Send the post request to update the device
  r = requests.post(
      f"{API}/device/edit",
      data=json.dumps(updated_device),
      timeout=5)

  # Check if status code is 404 (not found)
  assert r.status_code == 404

  # Parse the json response (devices)
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

  # Check if 'local/device' still has no devices
  assert len(get_all_devices()) == 0

def test_edit_device_invalid_json(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for edit device invalid json (400) """

  # Empty payload
  payload = {}

  # Send the post request to update the device
  r = requests.post(f"{API}/device/edit",
                      data=json.dumps(payload),
                      timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response (devices)
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

@pytest.mark.parametrize(
  "add_devices",
  [
    ["device_1", "device_2"]
  ],
  indirect=True
)
def test_edit_device_mac_already_exists( empty_devices_dir, add_devices, # pylint: disable=W0613
                                                               testrun): # pylint: disable=W0613
  """ Test for edit device when the mac address already exists (409) """

  # Load the first device (payload) using load_json utility method
  device_1 = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device_1 initial mac address
  mac_addr_1 = device_1["mac_addr"]

  # Load the second device using load_json utility method
  device_2 = load_json("device_config.json", directory=DEVICE_2_PATH)

  # Update the device_1 mac address with device_2 mac address
  device_1["mac_addr"] = device_2["mac_addr"]

  # Payload with the updated device mac address
  updated_device = {
    "mac_addr": mac_addr_1,
    "device": device_1 
    }

  # Exception if the device is not found
  if not device_exists(mac_addr_1):
    raise ValueError(f"Device with mac address:{mac_addr_1} not found")

  # Send the post request to update the device
  r = requests.post(f"{API}/device/edit",
                    data=json.dumps(updated_device),
                    timeout=5)

  # Check if status code is 409 (conflict)
  assert r.status_code == 409

  # Parse the json response (devices)
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_edit_device_test_in_progress(empty_devices_dir, add_devices, # pylint: disable=W0613
                                                testrun, start_test): # pylint: disable=W0613
  """ Test for edit device when a test is in progress (403) """

  # Load the device (payload) using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the mac address
  mac_addr = device["mac_addr"]

  # Update the manufacturer and model values
  device["manufacturer"] = "Updated Manufacturer"
  device["model"] = "Updated Model"

  # Payload with the updated device name
  updated_device = {
    "mac_addr": mac_addr,
    "device": device 
    }

  # Exception if the device is not found
  if not device_exists(mac_addr):
    raise ValueError(f"Device with mac address:{mac_addr} not found")

  # Send the post request to update the device
  r = requests.post(
      f"{API}/device/edit",
      data=json.dumps(updated_device),
      timeout=5)

  # Check if status code is 403 (forbidden)
  assert r.status_code == 403

  # Send a get request to verify that device was not updated
  r = requests.get(f"{API}/devices", timeout=5)

  # Exception if status code is not 200
  if r.status_code != 200:
    raise ValueError(f"API request failed with code: {r.status_code}")

  # Parse the response (devices list)
  response = r.json()

  # Iterate through the devices to find the device based on "mac_addr"
  updated_device = next(
    (d for d in response if d["mac_addr"] == mac_addr),
    None
  )

  # Error handling if the device is not being found
  if updated_device is None:
    raise Exception("The device could not be found")

  # Check that device "manufacturer" was not updated
  assert device["manufacturer"] != updated_device["manufacturer"]

  # Check that device "manufacturer" was not updated
  assert device["model"] != updated_device["model"]

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_edit_device_invalid_manufacturer(empty_devices_dir, add_devices, # pylint: disable=W0613
                                                                testrun): # pylint: disable=W0613
  """ Test for edit device invalid chars in 'manufacturer' field (400) """

  # Load the device
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Modify the "manufacturer" field value with the invalid characters
  device["manufacturer"] = "/';disallowed characters"

  # Send the post request to update the device
  r = requests.post(f"{API}/device", data=json.dumps(device),
                    timeout=5)

  # Check if the status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_edit_device_invalid_model(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """ Test for edit device invalid chars in 'model' field (400) """

  # Load the device
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Modify the "model" field value with the invalid characters
  device["model"] = "/';disallowed characters"

  # Send the post request to update the device
  r = requests.post(f"{API}/device", data=json.dumps(device),
                    timeout=5)

  # Check if the status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

def test_edit_long_chars(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for edit a device with model over 28 chars (400) """

  # Load the device
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Modify the "model" field value with 29 chars
  device["model"] = "a" * 29

  # Send the post request to edit the device
  r = requests.post(f"{API}/device", data=json.dumps(device),
                    timeout=5)

  # Check if the status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_delete_device(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """ Test for succesfully delete device endpoint (200) """

  # Load the device
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the mac address
  mac_addr = device["mac_addr"]

  # Assign the payload with device to be deleted
  payload = { "mac_addr": mac_addr }

  # Send the delete request
  r = requests.delete(f"{API}/device/",
              data=json.dumps(payload),
                            timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Check if the response contains "success" key
  assert "success" in response

  # Send the get request to check if the device has been deleted
  r = requests.get(f"{API}/devices", timeout=5)

  # Exception if status code is not 200
  if r.status_code != 200:
    raise ValueError(f"API request failed with code: {r.status_code}")

  # Parse the JSON response (device)
  device = r.json()

  # Iterate through the devices to find the device based on the 'mac address'
  deleted_device = next(
      (d for d in device if d["mac_addr"] == mac_addr),
      None
  )

  # Check if device was deleted
  assert deleted_device is None

def test_delete_device_not_found(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for delete device when the device doesn't exist (404) """  

  # Assign the payload with non existing device mac address
  payload = {"mac_addr" : "non-existing"}

  # Test that device_1 is not found
  r = requests.delete(f"{API}/device/",
                      data=json.dumps(payload),
                      timeout=5)

  # Check if status code is 404 (not found)
  assert r.status_code == 404

  # Parse the JSON response
  response = r.json()

  # Check if error in response
  assert "error" in response

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_delete_device_no_mac(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """ Test for delete device when no mac address in payload (400) """

  # Assign an empty payload (no mac address)
  payload = {}

  # Send the delete request
  r = requests.delete(f"{API}/device/",
                      data=json.dumps(payload),
                      timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the JSON response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

  # Check that device wasn't deleted from 'local/devices'
  assert len(get_all_devices()) == 1

@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_delete_device_testrun_in_progress(empty_devices_dir, add_devices, # pylint: disable=W0613
                                                     testrun, start_test): # pylint: disable=W0613
  """ Test for delete device when testrun is in progress (403) """

  # Load the device details
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the mac address
  mac_addr = device["mac_addr"]

  # Assign the payload with device to be deleted mac address
  payload = { "mac_addr": mac_addr }

  # Send the delete request
  r = requests.delete(f"{API}/device/",
              data=json.dumps(payload),
                            timeout=5)

  # Check if status code is 403 (forbidden)
  assert r.status_code == 403

  # Parse the JSON response
  response = r.json()

  # Check if the response contains "success" key
  assert "error" in response

def test_create_invalid_manufacturer(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for create device invalid chars in 'manufacturer' field (400) """

  # Load the device
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Modify the "manufacturer" field value with the invalid characters
  device["manufacturer"] = "/';disallowed characters"

  # Send the post request to create the device
  r = requests.post(f"{API}/device", data=json.dumps(device),
                    timeout=5)

  # Check if the status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

def test_create_invalid_model(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for create device invalid chars in 'model' field (400) """

  # Load the device
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Modify the "model" field value with the invalid characters
  device["model"] = "/';disallowed characters"

  # Send the post request to create the device
  r = requests.post(f"{API}/device", data=json.dumps(device),
                    timeout=5)

  # Check if the status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

def test_create_long_chars(empty_devices_dir, testrun): # pylint: disable=W0613
  """ Test for create a device with model over 28 chars (400) """

  # Load the device
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Modify the "model" field value with 29 chars
  device["model"] = "a" * 29

  # Send the post request to create the device
  r = requests.post(f"{API}/device", data=json.dumps(device),
                    timeout=5)

  # Check if the status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

def test_get_devices_format(testrun): # pylint: disable=W0613
  """ Test for get devices format (200) """

  # Send the get request
  r = requests.get(f"{API}/devices/format", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Check if the response is a list
  assert isinstance(response, list)

  # Store the expected main keys and types
  response_keys = {
    "step": int,
    "title": str, 
    "questions": list
  }

  # Store the 'questions' field expected keys and types
  questions_keys = {
    "id": int,
    "question": str,
    "type": str,
    "options": list
  }

  # Iterate over the response items
  for item in response:

    # Iterate over the 'response_keys' dict keys and values
    for key, key_type in response_keys.items():

      # Check if the key is in the response item
      assert key in item

      # Check if the key has the expected data type
      assert isinstance(item[key], key_type)

      # Iterate over the 'questions' field
      for questions in item["questions"]:

        # Iterate over the 'questions_keys' dict keys and values
        for key, key_type in questions_keys.items():

          # Check if the key is in 'questions' field
          assert key in questions

          # Check if the key has the expected data type
          assert isinstance(questions[key], key_type)

def test_sys_testpacks(testrun): # pylint: disable=W0613
  """ Test for system testpack endpoint (200) """

  # Send the get request to the API
  r = requests.get(f"{API}/system/testpacks", timeout=5)

  # Check if status code is 200 (ok)
  assert r.status_code == 200

  # Parse the response
  response = r.json()

  # Check if the response is a list
  assert isinstance(response, list)

# Tests for certificates endpoints

def delete_all_certs():
  """ Delete all certificates from root_certs folder """

  try:

    # Check if the profile_path (local/root_certs) exists and is a folder
    if os.path.exists(CERTS_DIRECTORY) and os.path.isdir(CERTS_DIRECTORY):

       # Iterate over all certificates from root_certs folder
      for item in os.listdir(CERTS_DIRECTORY):

        # Combine the directory path with the item name to create the full path
        item_path = os.path.join(CERTS_DIRECTORY, item)

        # Check if item is a file
        if os.path.isfile(item_path):

          #If True remove file
          os.unlink(item_path)

        else:

          # If item is a folder remove it
          shutil.rmtree(item_path)

  except PermissionError:

    # Permission related issues
    print(f"Permission Denied: {item}")

  except OSError as err:

    # System related issues
    print(f"Error removing {item}: {err}")

def load_cert_file(cert_filename):
  """ Utility method to load a certificate file in binary read mode """

  # Construct the full file path
  cert_path = os.path.join(CERTS_PATH, cert_filename)

  # Open the certificate file in binary read mode
  with open(cert_path, "rb") as cert_file:

    # Return the certificate file
    return cert_file.read()

def extract_name(cert_data):
  """ Utility method to extract the Common Name (CN) from cert data """

  # Load the cert using the cryptography library
  cert = x509.load_pem_x509_certificate(cert_data, default_backend())

  # Extract and return the common name value
  return cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value

@pytest.fixture()
def add_certs(request):
  """ Upload specified certificates to local/root_certs """

  # Access the parameter (certs list) provided to the fixture
  certs = request.param

  # Iterate over the certificate names provided
  for cert in certs:

    # Construct the full path for cert from 'testing/api/certificates'
    source_path = os.path.join(CERTS_PATH, cert)

    # Copy the cert from 'testing/api/certificates' to 'local/root_certs'
    shutil.copy(source_path, CERTS_DIRECTORY)

  # Return the list with certs name
  return certs

@pytest.fixture()
def reset_certs():
  """ Delete the certificates before and after each test """

  # Delete before the test
  delete_all_certs()

  yield

  # Delete after the test
  delete_all_certs()

# Use parametrize to create a test suite for 3 scenarios
@pytest.mark.parametrize("add_certs", [
  [],
  ["crt.pem"],
  ["crt.pem", "WR2.pem"],
], indirect=True)
def test_get_certs(reset_certs, add_certs, testrun): # pylint: disable=W0613
  """ Test for get certs when none, one or two certs are available (200) """

  # Send the GET request to "/system/config/certs" endpoint
  r = requests.get(f"{API}/system/config/certs", timeout=5)

  # Check if the status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response (certificates)
  response = r.json()

  # Check if response is a list
  assert isinstance(response, list)

  # Check if the number of certs matches the number of certs available
  assert len(response) == len(add_certs)

def test_upload_cert(reset_certs, testrun): # pylint: disable=W0613
  """ Test for upload certificate successfully (200) """

  # Load the first certificate file content using the utility method
  cert_file = load_cert_file("crt.pem")

  # Send a POST request to the API endpoint to upload the certificate
  r = requests.post(
    f"{API}/system/config/certs",
    files={"file": ("crt.pem", cert_file, "application/x-x509-ca-cert")},
    timeout=5
  )

  # Check if status code is 201 (Created)
  assert r.status_code == 201

  # Parse the response
  response = r.json()

  # Check if 'filename' field is in the response
  assert "filename" in response

  # Check if the certificate filename is 'crt.pem'
  assert response["filename"] == "crt.pem"

  # Load the second certificate file using the utility method
  cert_file = load_cert_file("WR2.pem")

  # Send a POST request to the API endpoint to upload the second certificate
  r = requests.post(
    f"{API}/system/config/certs",
    files={"file": ("WR2.pem", cert_file, "application/x-x509-ca-cert")},
    timeout=5
  )

  # Check if status code is 201 (Created)
  assert r.status_code == 201

  # Parse the response
  response = r.json()

  # Check if 'filename' field is in the response
  assert "filename" in response

  # Check if the certificate filename is 'WR2.pem'
  assert response["filename"] == "WR2.pem"

  # Send get request to check that the certificates are listed
  r = requests.get(f"{API}/system/config/certs", timeout=5)

  # Parse the response
  response = r.json()

  # Check if "crt.pem" exists
  assert any(cert["filename"] == "crt.pem" for cert in response)

  # Check if "WR2.pem" exists
  assert any(cert["filename"] == "WR2.pem" for cert in response)

def test_upload_invalid_cert_format(reset_certs, testrun): # pylint: disable=W0613
  """ Test for upload an invalid certificate format (400) """

  # Load the first certificate file content using the utility method
  cert_file = load_cert_file("invalid.pem")

  # Send a POST request to the API endpoint to upload the certificate
  r = requests.post(
    f"{API}/system/config/certs",
    files={"file": ("invalid.pem", cert_file, "application/x-x509-ca-cert")},
    timeout=5
  )

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the response
  response = r.json()

  # Check if "error" key is in response
  assert "error" in response

def test_upload_invalid_cert_name(reset_certs, testrun): # pylint: disable=W0613
  """ Test for upload a valid certificate with invalid filename (400) """

  # Assign the invalid certificate name to a variable
  cert_name = "invalidname1234567891234.pem"

  # Load the first certificate file content using the utility method
  cert_file = load_cert_file(cert_name)

  # Send a POST request to the API endpoint to upload the certificate
  r = requests.post(
    f"{API}/system/config/certs",
    files={"file": (cert_name, cert_file, "application/x-x509-ca-cert")},
    timeout=5
  )

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the response
  response = r.json()

  # Check if "error" key is in response
  assert "error" in response

@pytest.mark.parametrize("add_certs", [["crt.pem"]], indirect=True)
def test_upload_existing_cert(reset_certs, add_certs, testrun): # pylint: disable=W0613
  """ Test for upload an existing certificate (409) """

  # Load the cert file content using the utility method
  cert_file = load_cert_file("crt.pem")

  # Send a POST request to the API endpoint to upload the second certificate
  r = requests.post(
    f"{API}/system/config/certs",
    files={"file": ("crt.pem", cert_file, "application/x-x509-ca-cert")},
    timeout=5
  )

  # Check if status code is 409 (conflict)
  assert r.status_code == 409

  # Parse the json response
  response = r.json()

  # Check if "error" key is in response
  assert "error" in response

@pytest.mark.parametrize("add_certs", [["crt.pem", "WR2.pem"]], indirect=True)
def test_delete_cert_success(reset_certs, add_certs, testrun): # pylint: disable=W0613
  """ Test for successfully deleting an existing certificate (200) """

  # Load the first cert details to extract the 'name' value
  uploaded_cert = load_cert_file("crt.pem")

  # Assign the 'name' value from certificate
  cert_name = extract_name(uploaded_cert)

  # Assign the payload
  delete_payload = {"name": cert_name}

  # Send delete certificate request
  r = requests.delete(f"{API}/system/config/certs",
                      data=json.dumps(delete_payload),
                      timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Send the get request to display all certificates
  r = requests.get(f"{API}/system/config/certs", timeout=5)

  # Parse the json response
  response = r.json()

  # Check that the certificate is no longer listed
  assert not any(cert["filename"] == "crt.pem" for cert in response)

  # Load the second cert details to extract the 'name' value
  uploaded_cert = load_cert_file("WR2.pem")

  # Assign the 'name' value from certificate
  cert_name = extract_name(uploaded_cert)

  # Assign the payload
  delete_payload = {"name": cert_name}

  # Send delete certificate request
  r = requests.delete(f"{API}/system/config/certs",
                      data=json.dumps(delete_payload),
                      timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Send the get request to display all certificates
  r = requests.get(f"{API}/system/config/certs", timeout=5)

  # Parse the json response
  response = r.json()

  # Check that the certificate is no longer listed
  assert not any(cert["filename"] == "WR2.pem" for cert in response)

@pytest.mark.parametrize("add_certs", [["crt.pem"]], indirect=True)
def test_delete_cert_bad_request(reset_certs, add_certs, testrun): # pylint: disable=W0613
  """ Test for delete a certificate without providing the name (400)"""

   # Empty payload
  delete_payload = {}

  # Send the delete request
  r = requests.delete(f"{API}/system/config/certs",
                      data=json.dumps(delete_payload),
                      timeout=5)

  # Check if status code is 400 (Bad Request)
  assert r.status_code == 400

  # parse the json response
  response = r.json()

  # Check if error in response
  assert "error" in response

def test_delete_cert_not_found(reset_certs, testrun): # pylint: disable=W0613
  """ Test for delete certificate when does not exist (404) """

  # Attempt to delete a certificate with a name that doesn't exist
  delete_payload = {"name": "non existing"}

  # Send the delete request
  r = requests.delete(f"{API}/system/config/certs",
                      data=json.dumps(delete_payload),
                      timeout=5)

  # Check if status code is 404 (Not Found)
  assert r.status_code == 404

  # parse the json response
  response = r.json()

  # Check if error in response
  assert "error" in response

# Tests for profile endpoints

@pytest.fixture()
def add_profiles(request):
  """ Upload specified profile to local/risk_profiles """

  # Access the parameter (profiles list) provided to the fixture
  profiles = request.param

  # Iterate over the profile names provided
  for profile in profiles:

    # Construct full path of the file from 'testing/api/profiles' folder
    source_path = os.path.join(PROFILES_PATH, profile)

    # Copy the file_name from 'testing/api/profiles' to 'local/risk_profiles'
    shutil.copy(source_path, PROFILES_DIRECTORY)

  # Return the list with profiles name
  return profiles

def delete_all_profiles():
  """Utility method to delete all profiles from local/risk_profiles"""

  try:

    # Check if the profile_path (local/risk_profiles) exists and is a folder
    if os.path.exists(PROFILES_DIRECTORY) and os.path.isdir(PROFILES_DIRECTORY):

      # Iterate over all profiles from risk_profiles folder
      for item in os.listdir(PROFILES_DIRECTORY):

        # Create the full path
        item_path = os.path.join(PROFILES_DIRECTORY, item)

        # Check if item is a file
        if os.path.isfile(item_path):

          # Remove file
          os.unlink(item_path)

        else:

          # If item is a folder remove it
          shutil.rmtree(item_path)

  except PermissionError:

    # Permission related issues
    print(f"Permission Denied: {item}")

  except OSError as err:

    # System related issues
    print(f"Error removing {item}: {err}")

@pytest.fixture()
def empty_profiles_dir():
  """ Delete all the profiles before and after test """

  # Delete before the test
  delete_all_profiles()

  yield

  # Delete after the test
  delete_all_profiles()

def profile_exists(profile_name):
  """ Utility method to check if profile exists """

  # Send the get request
  r = requests.get(f"{API}/profiles", timeout=5)

  # Check if status code is not 200 (OK)
  if r.status_code != 200:
    raise ValueError(f"Api request failed with code: {r.status_code}")

  # Parse the JSON response to get the list of profiles
  profiles = r.json()

  # Return if name is in the list of profiles
  return any(p["name"] == profile_name for p in profiles)

@pytest.fixture()
def remove_risk_assessment():
  """ Fixture to remove and restore risk_assessment.json """

  # Path to the risk_assessment.json file
  risk_assessment_path = os.path.join("resources", "risk_assessment.json")

  # Backup path for the risk_assessment.json file
  backup_path = os.path.join("resources", "risk_assessment_backup.json")

  # Create a backup of the risk_assessment.json file
  if os.path.exists(risk_assessment_path):
    shutil.copy(risk_assessment_path, backup_path)

  # Delete the risk_assessment.json file
  if os.path.exists(risk_assessment_path):
    os.remove(risk_assessment_path)

  # Run the test
  yield

  # Restore the risk assessment file after the test
  if os.path.exists(backup_path):
    shutil.copy(backup_path, risk_assessment_path)
    os.remove(backup_path)

def test_get_profiles_format(testrun): # pylint: disable=W0613
  """ Test for profiles format (200) """

  # Send the get request
  r = requests.get(f"{API}/profiles/format", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response
  response = r.json()

  # Check if the response is a list
  assert isinstance(response, list)

  # Check that each item in the response has keys "questions" and "type"
  for item in response:
    assert "question" in item
    assert "type" in item

# Use parametrize to create a test suite for 3 scenarios
@pytest.mark.parametrize("add_profiles", [
  [],
  ["valid_profile.json"],
  ["valid_profile.json", "draft_profile.json"],
], indirect=True)
def test_get_profiles(empty_profiles_dir, add_profiles, testrun): # pylint: disable=W0613
  """ Test get profiles when none, one or two profiles are available (200) """

  # Send get request to the "/profiles" endpoint
  r = requests.get(f"{API}/profiles", timeout=5)

  # Check if the status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response (profiles)
  response = r.json()

  # Check if response is a list
  assert isinstance(response, list)

  # Check if the number of profiles matches the number of profiles available
  assert len(response) == len(add_profiles)

  # Assign the expected profile fields
  expected_fields = [
    "name", "status", "created", "version", "questions", "risk"
  ]

  # Check if profile exist
  if len(add_profiles) > 0:

    # Iterate through profiles
    for profile in response:

      # Iterate through expected_fields list
      for field in expected_fields:

        # Check if the field is in profile
        assert field in profile

      # Assign profile["questions"]
      profile_questions = profile["questions"]

      # Check if "questions" value is a list
      assert isinstance(profile_questions, list)

      # Check that "questions" value has the expected fields
      for element in profile_questions:

        # Check if each element is dict
        assert isinstance(element, dict)

        # Check if "question" key is in dict element
        assert "question" in element

        # Check if "asnswer" key is in dict element
        assert "answer" in element

def test_create_profile(testrun): # pylint: disable=W0613
  """ Test for create profile when profile does not exist (201) """

  # Load the profile
  new_profile = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Assign the profile name to profile_name
  profile_name = new_profile["name"]

  # Check if the profile already exists
  if profile_exists(profile_name):
    raise ValueError(f"Profile: {profile_name} exists")

  # Send the post request
  r = requests.post(f"{API}/profiles", data=json.dumps(new_profile), timeout=5)

  # Check if status code is 201 (Created)
  assert r.status_code == 201

  # Parse the response
  response = r.json()

  # Check if "success" key in response
  assert "success" in response

  # Verify profile creation
  r = requests.get(f"{API}/profiles", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response
  profiles = r.json()

  # Iterate through all the profiles to find the profile based on the "name"
  created_profile = next(
      (p for p in profiles if p["name"] == profile_name), None
  )

  # Check if profile was created
  assert created_profile is not None

@pytest.mark.parametrize("add_profiles", [
  ["valid_profile.json"]
], indirect=True)
def test_update_profile(empty_profiles_dir, add_profiles, testrun): # pylint: disable=W0613
  """ Test for update profile when profile already exists (200) """

  # Load the profile using load_json utility method
  new_profile = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Assign the new_profile name
  profile_name = new_profile["name"]

  # Assign the profile questions
  profile_questions = new_profile["questions"]

  # Assign the updated_profile name
  updated_profile_name = "updated_valid_profile"

  # Payload with the updated device name
  updated_profile = {
    "name": profile_name,
    "rename" : updated_profile_name,
    "questions": profile_questions    
    }

  # Exception if the profile does not exists
  if not profile_exists(profile_name):
    raise ValueError(f"Profile: {profile_name} does not exists")

  # Send the post request to update the profile
  r = requests.post(
      f"{API}/profiles",
      data=json.dumps(updated_profile),
      timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response
  response = r.json()

  # Check if "success" key in response
  assert "success" in response

  # Get request to verify profile update
  r = requests.get(f"{API}/profiles", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response
  profiles = r.json()

  # Iterate through the profiles to find the profile based on the updated "name"
  updated_profile_check = next(
    (p for p in profiles if p["name"] == updated_profile_name),
    None
  )
  # Check if profile was updated
  assert updated_profile_check is not None

def test_update_profile_no_profiles_format(empty_profiles_dir, # pylint: disable=W0613
                              remove_risk_assessment, testrun): # pylint: disable=W0613
  """Test for profile update when profiles format is not available (501)"""

  # Prepare a valid profile update request
  profile_update = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Send a POST request to update the profile
  r = requests.post(f"{API}/profiles",
                    data=json.dumps(profile_update),
                    timeout=5)

  # Check if the response status code is 501 (Not Implemented)
  assert r.status_code == 501

  # Parse the response
  response = r.json()

  # Check if "error" key is present in the response
  assert "error" in response

  # Check if the error message matches the expected response
  assert response["error"] == "Risk profiles are not available right now"

@pytest.mark.parametrize("add_profiles", [
  ["valid_profile.json"]
], indirect=True)
def test_update_profile_invalid_json(empty_profiles_dir, add_profiles, # pylint: disable=W0613
                                     testrun): # pylint: disable=W0613
  """ Test for update profile invalid JSON payload (400) """

  # Invalid JSON
  updated_profile = {}

  # Send the post request to update the profile
  r = requests.post(
      f"{API}/profiles",
      data=json.dumps(updated_profile),
      timeout=5)

  # Parse the response
  response = r.json()

  # Check if status code is 400 (Bad request)
  assert r.status_code == 400

  # Check if "error" key in response
  assert "error" in response

def test_create_profile_invalid_json(empty_profiles_dir, testrun): # pylint: disable=W0613
  """ Test for create profile invalid JSON payload (400) """

  # Invalid JSON
  new_profile = {}

  # Send the post request to update the profile
  r = requests.post(
      f"{API}/profiles",
      data=json.dumps(new_profile),
      timeout=5)

  # Parse the response
  response = r.json()

  # Check if status code is 400 (Bad request)
  assert r.status_code == 400

  # Check if "error" key in response
  assert "error" in response

def test_create_profile_invalid_name(empty_profiles_dir, testrun): # pylint: disable=W0613
  """ Test for create profile invalid name (400) """

  # Load the profile
  new_profile = load_json("invalid_name.json", directory=PROFILES_PATH)

  # Send the post request
  r = requests.post(f"{API}/profiles", data=json.dumps(new_profile), timeout=5)

  # Check if status code is 400 (Bad request)
  assert r.status_code == 400

  # Parse the response
  response = r.json()

  # Check if "error" key in response
  assert "error" in response

@pytest.mark.parametrize("add_profiles", [
  ["valid_profile.json"]
], indirect=True)
def test_update_profile_invalid_name(empty_profiles_dir, add_profiles, testrun): # pylint: disable=W0613
  """ Test for update profile invalid name (400) """

  # Load the profile using load_json utility method
  new_profile = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Assign the new_profile name
  profile_name = new_profile["name"]

  # Assign the profile questions
  profile_questions = new_profile["questions"]

  # Assign the updated_profile name
  updated_profile_name = r"\<>?/:;@''][=^"

  # Payload with the updated device name
  updated_profile = {
    "name": profile_name,
    "rename" : updated_profile_name,
    "questions": profile_questions
    }

  # Exception if the profile does not exists
  if not profile_exists(profile_name):
    raise ValueError(f"Profile: {profile_name} does not exists")

  # Send the post request to update the profile
  r = requests.post(
      f"{API}/profiles",
      data=json.dumps(updated_profile),
      timeout=5)

  # Check if status code is 400 (Bad request)
  assert r.status_code == 400

  # Parse the response
  response = r.json()

  # Check if "error" key in response
  assert "error" in response

@pytest.mark.parametrize("add_profiles", [
  ["valid_profile.json"]
], indirect=True)
def test_delete_profile(empty_profiles_dir, add_profiles, testrun): # pylint: disable=W0613
  """ Test for successfully delete profile (200) """

  # Load the profile using load_json utility method
  profile_to_delete = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Assign the profile name
  profile_name = profile_to_delete["name"]

  # Send the delete request
  r = requests.delete(
      f"{API}/profiles",
      data=json.dumps(profile_to_delete),
      timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Check if the response contains "success" key
  assert "success" in response

  # Check if the profile has been deleted
  r = requests.get(f"{API}/profiles", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  profiles = r.json()

  # Iterate through the profiles to find the profile based on the "name"
  deleted_profile = next(
      (p for p in profiles if p["name"] == profile_name),
      None
  )

  # Check if profile was deleted
  assert deleted_profile is None

def test_delete_profile_no_profile(empty_profiles_dir, testrun): # pylint: disable=W0613
  """ Test delete profile if the profile does not exists (404) """

  # Assign the profile to delete
  profile_to_delete = {"name": "non existing"}

  # Delete the profile
  r = requests.delete(
      f"{API}/profiles",
      data=json.dumps(profile_to_delete),
      timeout=5)

  # Check if status code is 404 (Profile does not exist)
  assert r.status_code == 404

  # Parse the response
  response = r.json()

  # Check if "error" key in response
  assert "error" in response

def test_delete_profile_invalid_json(empty_profiles_dir, testrun): # pylint: disable=W0613
  """ Test for delete profile invalid JSON payload (400) """

  # Invalid payload
  profile_to_delete = {}

  # Delete the profile
  r = requests.delete(
      f"{API}/profiles",
      data=json.dumps(profile_to_delete),
      timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the response
  response = r.json()

  # Check if "error" key in response
  assert "error" in response

  # Invalid payload
  profile_to_delete_2 = {"status": "Draft"}

  # Delete the profile
  r = requests.delete(
      f"{API}/profiles",
      data=json.dumps(profile_to_delete_2),
      timeout=5)

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Parse the response
  response = r.json()

  # Check if "error" key in response
  assert "error" in response

@pytest.mark.parametrize("add_profiles", [
  ["valid_profile.json"]
], indirect=True)
def test_delete_profile_server_error(empty_profiles_dir, add_profiles, # pylint: disable=W0613
                                     testrun): # pylint: disable=W0613
  """ Test for delete profile causing internal server error (500) """

  # Assign the profile from the fixture
  profile_to_delete = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Assign the profile name to profile_name
  profile_name = profile_to_delete["name"]

  # Construct the path to the profile JSON file in local/risk_profiles
  risk_profile_path = os.path.join(PROFILES_DIRECTORY, f"{profile_name}.json")

  # Delete the profile JSON file before making the DELETE request
  if os.path.exists(risk_profile_path):
    os.remove(risk_profile_path)

  # Send the DELETE request to delete the profile
  r = requests.delete(f"{API}/profiles",
                      json={"name": profile_to_delete["name"]},
                      timeout=5)

  # Check if status code is 500 (Internal Server Error)
  assert r.status_code == 500

  # Parse the json response
  response = r.json()

  # Check if error in response
  assert "error" in response

@pytest.mark.parametrize("add_profiles", [
  ["valid_profile.json"]
],indirect=True)
def test_export_profile_success(empty_profiles_dir, add_profiles, testrun): # pylint: disable=W0613
  """Test for successfully export profile as PDF (200)"""

  # Assign the profile from the fixture
  profile = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Assign the profile name to profile_name
  profile_name = profile["name"]

  # Send the get request
  r = requests.post(f"{API}/profile/{profile_name}", timeout=5)

  # Check if status code is 200 (ok)
  assert r.status_code == 200

  # Check if the response is a PDF
  assert r.headers["Content-Type"] == "application/pdf"

def test_export_profile_not_found(testrun): # pylint: disable=W0613
  """Test export profile as PDF when profile doesn't exist (404)"""

  # Assign the profile name
  profile_name = "non_existing"

  # Send the post request
  r = requests.post(f"{API}/profile/{profile_name}", timeout=5)

  # Check if status code is 404 (not found)
  assert r.status_code == 404

  # Parse the response json
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  assert "Profile could not be found" in response["error"]

@pytest.mark.parametrize("add_devices, add_profiles", [
    (["device_1"], ["valid_profile.json"])
], indirect=True)
def test_export_profile_with_device(empty_devices_dir, add_devices, # pylint: disable=W0613
                               empty_profiles_dir, add_profiles, # pylint: disable=W0613
                                                       testrun): # pylint: disable=W0613
  """ Test export profile as PDF with existing device (200)"""

  # Load the profile using load_json utility method
  profile = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Assign the profile name to profile_name
  profile_name = profile["name"]

  # Load the device using load_json utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  # Assign the device mac address
  mac_addr = device["mac_addr"]

  # Payload with device mac address
  payload = {"mac_addr": mac_addr}

  print(payload)

  # Send the post request
  r = requests.post(f"{API}/profile/{profile_name}",
                    json=payload,
                    timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Check if the response is a pdf file
  assert r.headers["Content-Type"] == "application/pdf"

@pytest.mark.parametrize("add_profiles", [
  ["valid_profile.json"]
],indirect=True)
def test_export_profile_device_not_found(empty_profiles_dir, add_profiles, # pylint: disable=W0613
                                      testrun): # pylint: disable=W0613
  """ Test export profile as PDF when device not found (404)"""

  # Load the profile using load_json utility method
  profile = load_json("valid_profile.json", directory=PROFILES_PATH)

  # Assign the profile name to profile_name
  profile_name = profile["name"]

  # Assign the device mac address
  device_mac = {"mac_addr": "non_existing"}

  # Send the post request
  r = requests.post(f"{API}/profile/{profile_name}",
                    json=device_mac,
                    timeout=5)

  # Check if status code is 404 (Not Found)
  assert r.status_code == 404

  # Parse the response json
  response = r.json()

  # Check if "error" in response
  assert "error" in response

  # Check if the correct error message returned
  error_message = "A device with that mac address could not be found"
  assert error_message in response["error"]

# Skipped tests currently not working due to blocking during monitoring period

@pytest.mark.skip()
def test_delete_device_testrun_running(testing_devices, testrun): # pylint: disable=W0613

  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)
  assert r.status_code == 200

  until_true(
      lambda: query_system_status().lower() == "waiting for device",
      "system status is `waiting for device`",
      30,
  )

  start_test_device("x123", BASELINE_MAC_ADDR)

  until_true(
      lambda: query_system_status().lower() == "in progress",
      "system status is `in progress`",
      600,
  )

  device_1 = {
        "manufacturer": "Google",
        "model": "First",
        "mac_addr": BASELINE_MAC_ADDR,
        "test_modules": {
            "dns": {"enabled": True},
            "connection": {"enabled": True},
            "ntp": {"enabled": True},
            "baseline": {"enabled": True},
            "nmap": {"enabled": True},
        },
    }
  r = requests.delete(f"{API}/device/",
                      data=json.dumps(device_1),
                      timeout=5)
  assert r.status_code == 403

@pytest.mark.skip()
@pytest.mark.parametrize("add_devices", [
  ["device_1"]
],indirect=True)
def test_stop_running_test(empty_devices_dir, add_devices, testrun): # pylint: disable=W0613
  """ Test for successfully stop testrun when test is running (200) """

  # Load the device and mac address using add_device utility method
  device = load_json("device_config.json", directory=DEVICE_1_PATH)

  mac_addr = device["mac_addr"]

  test_modules = device["test_modules"]

  # Payload with device details
  payload = {
            "device": {
              "mac_addr": mac_addr,
              "firmware": "test",
              "test_modules": test_modules
              }
            }

  r = requests.post(f"{API}/system/start", data=json.dumps(payload),
                    timeout=10)

  assert r.status_code == 200

  until_true(
      lambda: query_system_status().lower() == "waiting for device",
      "system status is `waiting for device`",
      30,
  )

  start_test_device("x12345", ALL_MAC_ADDR)

  until_true(
      lambda: query_test_count() > 1,
      "system status is `complete`",
      1000,
  )

  stop_test_device("x12345")

  # Validate response
  r = requests.post(f"{API}/system/stop", timeout=5)
  response = r.json()
  pretty_print(response)
  assert response == {"success": "Testrun stopped"}
  time.sleep(1)

  # Validate response
  r = requests.get(f"{API}/system/status", timeout=5)
  response = r.json()
  pretty_print(response)

  assert response["status"] == "Cancelled"

@pytest.mark.skip()
def test_status_in_progress(testing_devices, testrun): # pylint: disable=W0613

  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)
  assert r.status_code == 200

  until_true(
      lambda: query_system_status().lower() == "waiting for device",
      "system status is `waiting for device`",
      30,
  )

  start_test_device("x123", BASELINE_MAC_ADDR)

  until_true(
      lambda: query_system_status().lower() == "in progress",
      "system status is `in progress`",
      600,
  )

@pytest.mark.skip()
def test_start_testrun_already_in_progress(
  testing_devices, # pylint: disable=W0613
  testrun): # pylint: disable=W0613
  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  until_true(
      lambda: query_system_status().lower() == "waiting for device",
      "system status is `waiting for device`",
      30,
  )

  start_test_device("x123", BASELINE_MAC_ADDR)

  until_true(
      lambda: query_system_status().lower() == "in progress",
      "system status is `in progress`",
      600,
  )
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)
  assert r.status_code == 409

@pytest.mark.skip()
def test_trigger_run(testing_devices, testrun): # pylint: disable=W0613
  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)
  assert r.status_code == 200

  until_true(
      lambda: query_system_status().lower() == "waiting for device",
      "system status is `waiting for device`",
      30,
  )

  start_test_device("x123", BASELINE_MAC_ADDR)

  until_true(
      lambda: query_system_status().lower() == "compliant",
      "system status is `complete`",
      600,
  )

  stop_test_device("x123")

  # Validate response
  r = requests.get(f"{API}/system/status", timeout=5)
  response = r.json()
  pretty_print(response)

  # Validate results
  results = {x["name"]: x for x in response["tests"]["results"]}
  print(results)
  # there are only 3 baseline tests
  assert len(results) == 3

  # Validate structure
  with open(
      os.path.join(
          os.path.dirname(__file__), "mockito/running_system_status.json"
      ), encoding="utf-8"
  ) as f:
    mockito = json.load(f)

  # validate structure
  assert set(dict_paths(mockito)).issubset(set(dict_paths(response)))

  # Validate results structure
  assert set(dict_paths(mockito["tests"]["results"][0])).issubset(
      set(dict_paths(response["tests"]["results"][0]))
  )

  # Validate a result
  assert results["baseline.compliant"]["result"] == "Compliant"

@pytest.mark.skip()
def test_multiple_runs(testing_devices, testrun): # pylint: disable=W0613
  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload),
                    timeout=10)
  assert r.status_code == 200
  print(r.text)

  until_true(
      lambda: query_system_status().lower() == "waiting for device",
      "system status is `waiting for device`",
      30,
  )

  start_test_device("x123", BASELINE_MAC_ADDR)

  until_true(
      lambda: query_system_status().lower() == "compliant",
      "system status is `complete`",
      900,
  )

  stop_test_device("x123")

  # Validate response
  r = requests.get(f"{API}/system/status", timeout=5)
  response = r.json()
  pretty_print(response)

  # Validate results
  results = {x["name"]: x for x in response["tests"]["results"]}
  print(results)
  # there are only 3 baseline tests
  assert len(results) == 3

  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload),
                    timeout=10)
  # assert r.status_code == 200
  # returns 409
  print(r.text)

  until_true(
      lambda: query_system_status().lower() == "waiting for device",
      "system status is `waiting for device`",
      30,
  )

  start_test_device("x123", BASELINE_MAC_ADDR)

  until_true(
      lambda: query_system_status().lower() == "compliant",
      "system status is `complete`",
      900,
  )

  stop_test_device("x123")

@pytest.mark.skip()
def test_status_non_compliant(testing_devices, testrun): # pylint: disable=W0613

  r = requests.get(f"{API}/devices", timeout=5)
  all_devices = r.json()
  payload = {
    "device": {
      "mac_addr": all_devices[0]["mac_addr"],
      "firmware": "asd"
    }
  }
  r = requests.post(f"{API}/system/start", data=json.dumps(payload),
                    timeout=10)
  assert r.status_code == 200
  print(r.text)

  until_true(
      lambda: query_system_status().lower() == "waiting for device",
      "system status is `waiting for device`",
      30,
  )

  start_test_device("x123", all_devices[0]["mac_addr"])

  until_true(
      lambda: query_system_status().lower() == "non-compliant",
      "system status is `complete",
      600,
  )

  stop_test_device("x123")
