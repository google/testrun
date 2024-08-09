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
import copy
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import time
from typing import Iterator
import pytest
import requests


ALL_DEVICES = "*"
API = "http://127.0.0.1:8000"
LOG_PATH = "/tmp/testrun.log"
TEST_SITE_DIR = ".."

DEVICES_DIRECTORY = "local/devices"
TESTING_DEVICES = "../device_configs"
PROFILES_DIRECTORY = "local/risk_profiles"
SYSTEM_CONFIG_PATH = "local/system.json"
SYSTEM_CONFIG_RESTORE_PATH = "testing/api/system.json"
PROFILES_PATH = "testing/api/profiles"

BASELINE_MAC_ADDR = "02:42:aa:00:01:01"
ALL_MAC_ADDR = "02:42:aa:00:00:01"

def pretty_print(dictionary: dict):
  """ Pretty print dictionary """
  print(json.dumps(dictionary, indent=4))

def query_system_status() -> str:
  """Query system status from API and returns this"""
  r = requests.get(f"{API}/system/status", timeout=5)
  response = r.json()
  return response["status"]

def query_test_count() -> int:
  """Queries status and returns number of test results"""
  r = requests.get(f"{API}/system/status", timeout=5)
  response = r.json()
  return len(response["tests"]["results"])

def start_test_device(
    device_name, mac_address, image_name="test-run/ci_device_1", args=""
):
  """ Start test device container with given name """
  cmd = subprocess.run(
      f"docker run -d --network=endev0 --mac-address={mac_address}"
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
  """Utility method to load json files' """
  # Construct the base path relative to the main folder
  base_path = Path(__file__).resolve().parent.parent.parent
  # Construct the full file path
  file_path = base_path / directory / file_name

  # Open the file in read mode
  with open(file_path, "r", encoding="utf-8") as file:
    # Return the file content
    return json.load(file)

@pytest.fixture
def empty_devices_dir():
  """ Use e,pty devices directory """
  local_delete_devices(ALL_DEVICES)

@pytest.fixture
def testing_devices():
  """ Use devices from the testing/device_configs directory """
  local_delete_devices(ALL_DEVICES)
  shutil.copytree(
      os.path.join(os.path.dirname(__file__), TESTING_DEVICES),
      os.path.join(DEVICES_DIRECTORY),
      dirs_exist_ok=True,
  )
  return local_get_devices()

@pytest.fixture
def testrun(request): # pylint: disable=W0613
  """ Start intstance of testrun """
  # pylint: disable=W1509
  with subprocess.Popen(
      "bin/testrun",
      stdout=subprocess.PIPE,
      stderr=subprocess.STDOUT,
      encoding="utf-8",
      preexec_fn=os.setsid
  ) as proc:

    while True:
      try:
        outs = proc.communicate(timeout=1)[0]
      except subprocess.TimeoutExpired as e:
        if e.output is not None:
          output = e.output.decode("utf-8")
          if re.search("API waiting for requests", output):
            break
      except Exception:
        pytest.fail("testrun terminated")

    time.sleep(2)

    yield

    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    try:
      outs = proc.communicate(timeout=60)[0]
    except subprocess.TimeoutExpired as e:
      print(e.output)
      os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
      pytest.exit(
          "waited 60s but Testrun did not cleanly exit .. terminating all tests"
      )

  print(outs)

  cmd = subprocess.run(
      "docker stop $(docker ps -a -q)", shell=True,
      capture_output=True, check=False
  )
  print(cmd.stdout)
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

def dict_paths(thing: dict, stem: str = "") -> Iterator[str]:
  """Returns json paths (in dot notation) from a given dictionary"""
  for k, v in thing.items():
    path = f"{stem}.{k}" if stem else k
    if isinstance(v, dict):
      yield from dict_paths(v, path)
    else:
      yield path

def get_network_interfaces():
  """return list of network interfaces on machine

  uses /sys/class/net rather than inetfaces as test-run uses the latter
  """
  ifaces = []
  path = Path("/sys/class/net")
  for i in path.iterdir():
    if not i.is_dir():
      continue
    if i.stem.startswith("en") or i.stem.startswith("eth"):
      ifaces.append(i.stem)
  return ifaces

def local_delete_devices(path):
  """ Deletes all local devices 
  """
  for thing in Path(DEVICES_DIRECTORY).glob(path):
    if thing.is_file():
      thing.unlink()
    else:
      shutil.rmtree(thing)

def local_get_devices():
  """ Returns path to device configs of devices in local/devices directory"""
  return sorted(
      Path(DEVICES_DIRECTORY).glob(
          "*/device_config.json"
      )
  )

# Tests for system endpoints

@pytest.fixture()
def restore_config():
  """Restore the original configuration (system.json) after the test"""
  yield

  # Restore system.json from 'testing/api/' after the test
  if os.path.exists(SYSTEM_CONFIG_RESTORE_PATH):
    shutil.copy(SYSTEM_CONFIG_RESTORE_PATH, SYSTEM_CONFIG_PATH)

def test_get_system_interfaces(testrun): # pylint: disable=W0613
  """Tests API system interfaces against actual local interfaces"""

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

def test_update_system_config(testrun, restore_config): # pylint: disable=W0613
  """Test update system configuration endpoint ('/system/config')"""

  # Configuration data to update
  updated_system_config = {
      "network": {
          "device_intf": "updated_endev0a",
          "internet_intf": "updated_wlan1"
      },
      "log_level": "DEBUG"
  }

  # Send the post request to update the system configuration
  r = requests.post(f"{API}/system/config",
                    data=json.dumps(updated_system_config),
                    timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Check if the response["network"]["device_intf"] has been updated
  assert (
    response["network"]["device_intf"]
    == updated_system_config["network"]["device_intf"]
  )

  # Check if the response["network"]["internet_intf"] has been updated
  assert (
        response["network"]["internet_intf"]
        == updated_system_config["network"]["internet_intf"]
  )

  # Check if the response["log_level"] has been updated
  assert (
    response["log_level"]
    == updated_system_config["log_level"]
  )

def test_update_system_config_invalid_config(testrun, restore_config): # pylint: disable=W0613
  """Test invalid configuration file for update system configuration"""

  # Configuration data to update with missing "log_level" field
  updated_system_config = {
      "network": {
          "device_intf": "updated_endev0a",
          "internet_intf": "updated_wlan1"
      }
  }

  # Send the post request to update the system configuration
  r = requests.post(f"{API}/system/config",
                    data=json.dumps(updated_system_config),
                    timeout=5)

  # Check if status code is 400 (Invalid config)
  assert r.status_code == 400

def test_get_system_config(testrun): # pylint: disable=W0613
  """Tests get system configuration endpoint ('/system/config')"""

  # Send a GET request to the API to retrieve system configuration
  r = requests.get(f"{API}/system/config", timeout=5)

  # Load system configuration file
  local_config = load_json("system.json", directory="local")

  # Parse the JSON response
  api_config = r.json()

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Validate structure
  assert set(dict_paths(api_config)) | set(dict_paths(local_config)) == set(
      dict_paths(api_config)
  )

  # Check if the device interface in the local config matches the API config
  assert (
      local_config["network"]["device_intf"]
      == api_config["network"]["device_intf"]
  )

  # Check if the internet interface in the local config matches the API config
  assert (
      local_config["network"]["internet_intf"]
      == api_config["network"]["internet_intf"]
  )

def test_start_testrun_started_successfully(testing_devices, testrun): # pylint: disable=W0613
  """Test for testrun started successfully """

  # Payload with device details
  payload = {"device": {
             "mac_addr": BASELINE_MAC_ADDR,
             "firmware": "asd", 
             "test_modules": {
                "dns": {"enabled": False},
                "connection": {"enabled": True},
                "ntp": {"enabled": False},
                "baseline": {"enabled": False},
                "nmap": {"enabled": False}
            }}}

  # Send the post request
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Check if the response status code is 200 (OK)
  assert r.status_code == 200

  # Parse the json response
  response = r.json()

  # Check that device is in response
  assert "device" in response

  # Check that mac_addr in response
  assert "mac_addr" in response["device"]

  # Check that firmware in response
  assert "firmware" in response["device"]

def test_start_testrun_missing_device(testing_devices, testrun): # pylint: disable=W0613
  """Test for missing device when testrun is started """

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

def test_start_testrun_already_started(testing_devices, testrun): # pylint: disable=W0613
  """Test for testrun already started """

  # Payload with device details
  payload = {"device": {
             "mac_addr": BASELINE_MAC_ADDR,
             "firmware": "asd", 
             "test_modules": {
                "dns": {"enabled": False},
                "connection": {"enabled": True},
                "ntp": {"enabled": False},
                "baseline": {"enabled": False},
                "nmap": {"enabled": False}
            }}}

  # Send the post request (start test)
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Check if the response status code is 200 (OK)
  assert r.status_code == 200

  # Send the second post request (start test again)
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Parse the json response
  response = r.json()

  # Check if the response status code is 409 (Conflict)
  assert r.status_code == 409

  # Check if 'error' in response
  assert "error" in response

def test_start_testrun_device_not_found(testing_devices, testrun): # pylint: disable=W0613
  """Test for start testrun device not found """

  # Payload with device details with no mac address assigned
  payload = {"device": {
             "mac_addr": "",
             "firmware": "asd", 
             "test_modules": {
                "dns": {"enabled": False},
                "connection": {"enabled": True},
                "ntp": {"enabled": False},
                "baseline": {"enabled": False},
                "nmap": {"enabled": False}
            }}}

  # Send the post request
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Check if the response status code is 404 (not found)
  assert r.status_code == 404

  # Parse the json response
  response = r.json()

  # Check if 'error' in response
  assert "error" in response

# Currently not working due to blocking during monitoring period
@pytest.mark.skip()
def test_status_in_progress(testing_devices, testrun):  # pylint: disable=W0613

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

# Currently not working due to blocking during monitoring period
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
def test_stop_running_test(testing_devices, testrun): # pylint: disable=W0613
  payload = {"device": {"mac_addr": ALL_MAC_ADDR, "firmware": "asd"}}
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

def test_stop_running_not_running(testrun): # pylint: disable=W0613
  # Validate response
  r = requests.post(f"{API}/system/stop",
                    timeout=10)
  response = r.json()
  pretty_print(response)

  assert r.status_code == 404
  assert response["error"] == "Testrun is not currently running"

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

def test_status_idle(testrun): # pylint: disable=W0613
  """Test system status 'idle' endpoint (/system/status)"""
  until_true(
      lambda: query_system_status().lower() == "idle",
      "system status is `idle`",
      30,
  )

def test_system_shutdown(testrun): # pylint: disable=W0613
  """Test the shutdown system endpoint"""
  # Send a POST request to initiate the system shutdown
  r = requests.post(f"{API}/system/shutdown", timeout=5)

  # Check if the response status code is 200 (OK)
  assert r.status_code == 200, f"Expected status code 200, got {r.status_code}"

def test_system_shutdown_in_progress(testrun):  # pylint: disable=W0613
  """Test system shutdown during an in-progress test"""
  # Payload with device details to start a test
  payload = {
      "device": {
          "mac_addr": BASELINE_MAC_ADDR,
          "firmware": "asd",
          "test_modules": {
              "dns": {"enabled": False},
              "connection": {"enabled": True},
              "ntp": {"enabled": False},
              "baseline": {"enabled": False},
              "nmap": {"enabled": False}
          }
      }
  }

  # Start a test
  r = requests.post(f"{API}/system/start", data=json.dumps(payload), timeout=10)

  # Check if status code is not 200 (OK)
  if r.status_code != 200:
    raise ValueError(f"Api request failed with code: {r.status_code}")

  # Attempt to shutdown while the test is running
  r = requests.post(f"{API}/system/shutdown", timeout=5)

  # Check if the response status code is 400 (test in progress)
  assert r.status_code == 400

def test_system_latest_version(testrun): # pylint: disable=W0613
  """Test for testrun version when the latest version is installed"""

  # Send the get request to the API
  r = requests.get(f"{API}/system/version", timeout=5)

  # Parse the response
  response = r.json()

  # Check if status code is 200 (update available)
  assert r.status_code == 200
  # Check if an update is available
  assert response["update_available"] is False

# Tests for reports endpoints

def test_get_reports_no_reports(testrun): # pylint: disable=W0613
  """Test get reports when no reports exist."""

  # Send a GET request to the /reports endpoint
  r = requests.get(f"{API}/reports", timeout=5)

  # Check if the status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Check if the response is a list
  assert isinstance(response, list)

  # Check if the response is an empty list
  assert response == []

# Tests for device endpoints

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

def test_create_get_devices(empty_devices_dir, testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  r = requests.post(f"{API}/device", data=json.dumps(device_1),
                    timeout=5)
  print(r.text)
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  device_2 = {
      "manufacturer": "Google",
      "model": "Second",
      "mac_addr": "00:1e:42:35:73:c6",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }
  r = requests.post(f"{API}/device", data=json.dumps(device_2),
                    timeout=5)
  assert r.status_code == 201
  assert len(local_get_devices()) == 2

  # Test that returned devices API endpoint matches expected structure
  r = requests.get(f"{API}/devices", timeout=5)
  all_devices = r.json()
  pretty_print(all_devices)

  with open(
      os.path.join(os.path.dirname(__file__), "mockito/get_devices.json"),
      encoding="utf-8"
  ) as f:
    mockito = json.load(f)

  print(mockito)

  # Validate structure
  assert all(isinstance(x, dict) for x in all_devices)

  # TOOO uncomment when is done
  # assert set(dict_paths(mockito[0])) == set(dict_paths(all_devices[0]))

  # Validate contents of given keys matches
  for key in ["mac_addr", "manufacturer", "model"]:
    assert set([all_devices[0][key], all_devices[1][key]]) == set(
        [device_1[key], device_2[key]]
    )

def test_delete_device_success(empty_devices_dir, testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  # Send create device request
  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)

  # Check device has been created
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  device_2 = {
      "manufacturer": "Google",
      "model": "Second",
      "mac_addr": "00:1e:42:35:73:c6",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }
  r = requests.post(f"{API}/device",
                    data=json.dumps(device_2),
                    timeout=5)
  assert r.status_code == 201
  assert len(local_get_devices()) == 2


  # Test that device_1 deletes
  r = requests.delete(f"{API}/device/",
                      data=json.dumps(device_1),
                      timeout=5)
  assert r.status_code == 200
  assert len(local_get_devices()) == 1


  # Test that returned devices API endpoint matches expected structure
  r = requests.get(f"{API}/devices", timeout=5)
  all_devices = r.json()
  pretty_print(all_devices)

  with open(
      os.path.join(os.path.dirname(__file__),
                   "mockito/get_devices.json"),
                   encoding="utf-8"
  ) as f:
    mockito = json.load(f)

  print(mockito)

  # Validate structure
  assert all(isinstance(x, dict) for x in all_devices)

  # TOOO uncomment when is done
  # assert set(dict_paths(mockito[0])) == set(dict_paths(all_devices[0]))

  # Validate contents of given keys matches
  for key in ["mac_addr", "manufacturer", "model"]:
    assert set([all_devices[0][key]]) == set(
        [device_2[key]]
    )

def test_delete_device_not_found(empty_devices_dir, testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  # Send create device request
  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)

  # Check device has been created
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  # Test that device_1 deletes
  r = requests.delete(f"{API}/device/",
                      data=json.dumps(device_1),
                      timeout=5)
  assert r.status_code == 200
  assert len(local_get_devices()) == 0

  # Test that device_1 is not found
  r = requests.delete(f"{API}/device/",
                      data=json.dumps(device_1),
                      timeout=5)
  assert r.status_code == 404
  assert len(local_get_devices()) == 0

def test_delete_device_no_mac(empty_devices_dir, testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  # Send create device request
  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)

  # Check device has been created
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  device_1.pop("mac_addr")

  # Test that device_1 can't delete with no mac address
  r = requests.delete(f"{API}/device/",
                      data=json.dumps(device_1),
                      timeout=5)
  assert r.status_code == 400
  assert len(local_get_devices()) == 1

# Currently not working due to blocking during monitoring period
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

def test_start_system_not_configured_correctly(
    empty_devices_dir, # pylint: disable=W0613
    testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  # Send create device request
  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)

  payload = {"device": {"mac_addr": None, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start",
                    data=json.dumps(payload),
                    timeout=10)
  assert r.status_code == 500

def test_start_device_not_found(empty_devices_dir, # pylint: disable=W0613
                                testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  # Send create device request
  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)

  r = requests.delete(f"{API}/device/",
                      data=json.dumps(device_1),
                      timeout=5)
  assert r.status_code == 200

  payload = {"device": {"mac_addr": device_1["mac_addr"], "firmware": "asd"}}
  r = requests.post(f"{API}/system/start",
                    data=json.dumps(payload),
                    timeout=10)
  assert r.status_code == 404

def test_start_missing_device_information(
    empty_devices_dir, # pylint: disable=W0613
    testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  # Send create device request
  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)

  payload = {}
  r = requests.post(f"{API}/system/start",
                    data=json.dumps(payload),
                    timeout=10)
  assert r.status_code == 400

def test_create_device_already_exists(
    empty_devices_dir, # pylint: disable=W0613
    testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)
  assert r.status_code == 409

def test_create_device_invalid_json(
    empty_devices_dir, # pylint: disable=W0613
    testrun): # pylint: disable=W0613
  device_1 = {
  }

  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)
  assert r.status_code == 400

def test_create_device_invalid_request(
    empty_devices_dir, # pylint: disable=W0613
    testrun): # pylint: disable=W0613

  r = requests.post(f"{API}/device",
                    data=None,
                    timeout=5)
  print(r.text)
  assert r.status_code == 400

def test_device_edit_device(
    testing_devices, # pylint: disable=W0613
    testrun): # pylint: disable=W0613
  with open(
      testing_devices[1], encoding="utf-8"
  ) as f:
    local_device = json.load(f)

  mac_addr = local_device["mac_addr"]
  new_model = "Alphabet"

  r = requests.get(f"{API}/devices", timeout=5)
  all_devices = r.json()

  api_device = next(x for x in all_devices if x["mac_addr"] == mac_addr)

  updated_device = copy.deepcopy(api_device)
  updated_device["model"] = new_model

  new_test_modules = {
      k: {"enabled": not v["enabled"]}
      for k, v in updated_device["test_modules"].items()
  }
  updated_device["test_modules"] = new_test_modules

  updated_device_payload = {}
  updated_device_payload["device"] = updated_device
  updated_device_payload["mac_addr"] = mac_addr

  print("updated_device")
  pretty_print(updated_device)
  print("api_device")
  pretty_print(api_device)

  # update device
  r = requests.post(f"{API}/device/edit",
                    data=json.dumps(updated_device_payload),
                    timeout=5)

  assert r.status_code == 200

  r = requests.get(f"{API}/devices", timeout=5)
  all_devices = r.json()
  updated_device_api = next(x for x in all_devices if x["mac_addr"] == mac_addr)

  assert updated_device_api["model"] == new_model
  assert updated_device_api["test_modules"] == new_test_modules

def test_device_edit_device_not_found(
    empty_devices_dir, # pylint: disable=W0613
    testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  updated_device = copy.deepcopy(device_1)

  updated_device_payload = {}
  updated_device_payload["device"] = updated_device
  updated_device_payload["mac_addr"] = "00:1e:42:35:73:c6"
  updated_device_payload["model"] = "Alphabet"


  r = requests.post(f"{API}/device/edit",
                      data=json.dumps(updated_device_payload),
                      timeout=5)

  assert r.status_code == 404

def test_device_edit_device_incorrect_json_format(
    empty_devices_dir, # pylint: disable=W0613
    testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  updated_device_payload = {}


  r = requests.post(f"{API}/device/edit",
                      data=json.dumps(updated_device_payload),
                      timeout=5)

  assert r.status_code == 400

def test_device_edit_device_with_mac_already_exists(
    empty_devices_dir, # pylint: disable=W0613
    testrun): # pylint: disable=W0613
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  r = requests.post(f"{API}/device",
                    data=json.dumps(device_1),
                    timeout=5)
  print(r.text)
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  device_2 = {
      "manufacturer": "Google",
      "model": "Second",
      "mac_addr": "00:1e:42:35:73:c6",
      "test_modules": {
          "dns": {"enabled": True},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }
  r = requests.post(f"{API}/device",
                    data=json.dumps(device_2),
                    timeout=5)
  assert r.status_code == 201
  assert len(local_get_devices()) == 2

  updated_device = copy.deepcopy(device_1)

  updated_device_payload = {}
  updated_device_payload = {}
  updated_device_payload["device"] = updated_device
  updated_device_payload["mac_addr"] = "00:1e:42:35:73:c6"
  updated_device_payload["model"] = "Alphabet"


  r = requests.post(f"{API}/device/edit",
                      data=json.dumps(updated_device_payload),
                      timeout=5)

  assert r.status_code == 409

def test_invalid_path_get(testrun): # pylint: disable=W0613
  r = requests.get(f"{API}/blah/blah", timeout=5)
  response = r.json()
  assert r.status_code == 404
  with open(
      os.path.join(os.path.dirname(__file__), "mockito/invalid_request.json"),
      encoding="utf-8"
  ) as f:
    mockito = json.load(f)

  # validate structure
  assert set(dict_paths(mockito)) == set(dict_paths(response))

def test_create_invalid_chars(empty_devices_dir, testrun): # pylint: disable=W0613
  # local_delete_devices(ALL_DEVICES)
  # We must start test run with no devices in local/devices for this test
  # to function as expected
  assert len(local_get_devices()) == 0

  # Test adding device
  device_1 = {
      "manufacturer": "/'disallowed characters///",
      "model": "First",
      "mac_addr": BASELINE_MAC_ADDR,
      "test_modules": {
          "dns": {"enabled": False},
          "connection": {"enabled": True},
          "ntp": {"enabled": True},
          "baseline": {"enabled": True},
          "nmap": {"enabled": True},
      },
  }

  r = requests.post(f"{API}/device", data=json.dumps(device_1),
                    timeout=5)
  print(r.text)
  print(r.status_code)

def test_get_test_modules(testrun): # pylint: disable=W0613
  """Test the /system/modules endpoint to get the test modules"""

  # Send a GET request to the API endpoint
  r = requests.get(f"{API}/system/modules", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the JSON response
  response = r.json()

  # Check if the response is a list
  assert isinstance(response, list)

# Tests for profile endpoints
def delete_all_profiles():
  """Utility method to delete all profiles from risk_profiles folder"""

  # Assign the profiles directory
  profiles_path = Path(PROFILES_DIRECTORY)

  try:
    # Check if the profile_path (local/risk_profiles) exists and is a folder
    if profiles_path.exists() and profiles_path.is_dir():
      # Iterate over all profiles from risk_profiles folder
      for item in profiles_path.iterdir():
        # Check if item is a file
        if item.is_file():
          #If True remove file
          item.unlink()
        else:
          # If item is a folder remove it
          shutil.rmtree(item)

  except PermissionError:
    # Permission related issues
    print(f"Permission Denied: {item}")
  except OSError as err:
    # System related issues
    print(f"Error removing {item}: {err}")

def create_profile(file_name):
  """Utility method to create the profile"""

  # Load the profile
  new_profile = load_json(file_name, directory=PROFILES_PATH)

  # Assign the profile name to profile_name
  profile_name = new_profile["name"]

  # Exception if the profile already exists
  if profile_exists(profile_name):
    raise ValueError(f"Profile: {profile_name} exists")

  # Send the post request
  r = requests.post(f"{API}/profiles", data=json.dumps(new_profile), timeout=5)

  # Exception if status code is not 201
  if r.status_code != 201:
    raise ValueError(f"API request failed with code: {r.status_code}")

  # Return the profile
  return new_profile

@pytest.fixture()
def reset_profiles():
  """Delete the profiles before and after each test"""

  # Delete before the test
  delete_all_profiles()

  yield

  # Delete after the test
  delete_all_profiles()

@pytest.fixture()
def add_profile():
  """Fixture to create profiles during tests."""
  # Returning the reference to create_profile
  return create_profile

def profile_exists(profile_name):
  """Utility method to check if profile exists"""
  # Send the get request
  r = requests.get(f"{API}/profiles", timeout=5)
  # Check if status code is not 200 (OK)
  if r.status_code != 200:
    raise ValueError(f"Api request failed with code: {r.status_code}")
  # Parse the JSON response to get the list of profiles
  profiles = r.json()
  # Return if name is in the list of profiles
  return any(p["name"] == profile_name for p in profiles)

def test_get_profiles_format(testrun):  # pylint: disable=W0613
  """Test profiles format"""

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

def test_get_profiles(testrun, reset_profiles, add_profile):  # pylint: disable=W0613
  """Test for get profiles (no profile, one profile, two profiles)"""

  # Test for no profiles

  # Send the get request to "/profiles" endpoint
  r = requests.get(f"{API}/profiles", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response (profiles)
  response = r.json()

  # Check if response is a list
  assert isinstance(response, list)

  # Check if the list is empty
  assert len(response) == 0

  # Test for one profile

  # Load the profile using add_profile fixture
  add_profile("new_profile.json")

  # Send get request to the "/profiles" endpoint
  r = requests.get(f"{API}/profiles", timeout=5)

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Parse the response (profiles)
  response = r.json()

  # Check if response is a list
  assert isinstance(response, list)

  # Check if response contains one profile
  assert len(response) == 1

  # Check that each profile has the expected fields
  for profile in response:
    for field in ["name", "status", "created", "version", "questions", "risk"]:
      assert field in profile

    # Check if "questions" value is a list
    assert isinstance(profile["questions"], list)

    # Check that "questions" value has the expected fields
    for element in profile["questions"]:
      # Check if each element is dict
      assert isinstance(element, dict)

      # Check if "question" key is in dict element
      assert "question" in element

      # Check if "asnswer" key is in dict element
      assert "answer" in element

  # Test for two profiles

  # Load the profile using add_profile fixture
  add_profile("new_profile_2.json")

  # Send the get request to "/profiles" endpoint
  r = requests.get(f"{API}/profiles", timeout=5)

  # Parse the response (profiles)
  response = r.json()

  # Check if status code is 200 (OK)
  assert r.status_code == 200

  # Check if response is a list
  assert isinstance(response, list)

  # Check if response contains two profiles
  assert len(response) == 2

def test_create_profile(testrun, reset_profiles): # pylint: disable=W0613
  """Test for create profile if not exists"""

  # Load the profile
  new_profile = load_json("new_profile.json", directory=PROFILES_PATH)

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

def test_update_profile(testrun, reset_profiles, add_profile): # pylint: disable=W0613
  """Test for update profile when exists"""

  # Load the new profile using add_profile fixture
  new_profile = add_profile("new_profile.json")

  # Load the updated profile using load_json utility method
  updated_profile = load_json("updated_profile.json",
                              directory=PROFILES_PATH)

  # Assign the new_profile name
  profile_name = new_profile["name"]

  # Assign the updated_profile name
  updated_profile_name = updated_profile["rename"]

  # Exception if the profile does't exists
  if not profile_exists(profile_name):
    raise ValueError(f"Profile: {profile_name} exists")

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

def test_update_profile_invalid_json(testrun, reset_profiles, add_profile): # pylint: disable=W0613
  """Test for update profile invalid JSON payload (no 'name')"""

  # Load the new profile using add_profile fixture
  add_profile("new_profile.json")

  # invalid JSON
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

def test_create_profile_invalid_json(testrun, reset_profiles): # pylint: disable=W0613
  """Test for create profile invalid JSON payload """

  # invalid JSON
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

def test_delete_profile(testrun, reset_profiles, add_profile): # pylint: disable=W0613
  """Test for delete profile"""

  # Assign the profile from the fixture
  profile_to_delete = add_profile("new_profile.json")

  # Assign the profile name
  profile_name = profile_to_delete["name"]

  # Delete the profile
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

def test_delete_profile_no_profile(testrun, reset_profiles): # pylint: disable=W0613
  """Test delete profile if the profile does not exists"""

  # Assign the profile to delete
  profile_to_delete = {"name": "New Profile"}

  # Delete the profile
  r = requests.delete(
      f"{API}/profiles",
      data=json.dumps(profile_to_delete),
      timeout=5)

  # Check if status code is 404 (Profile does not exist)
  assert r.status_code == 404

def test_delete_profile_invalid_json(testrun, reset_profiles): # pylint: disable=W0613
  """Test for delete profile wrong JSON payload"""

  profile_to_delete = {}

  # Delete the profile
  r = requests.delete(
      f"{API}/profiles",
      data=json.dumps(profile_to_delete),
      timeout=5)

  # Parse the response
  response = r.json()

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Check if "error" key in response
  assert "error" in response

  profile_to_delete_2 = {"status": "Draft"}
  # Delete the profile
  r = requests.delete(
      f"{API}/profiles",
      data=json.dumps(profile_to_delete_2),
      timeout=5)

  # Parse the response
  response = r.json()

  # Check if status code is 400 (bad request)
  assert r.status_code == 400

  # Check if "error" key in response
  assert "error" in response

def test_delete_profile_internal_server_error(testrun, # pylint: disable=W0613
                                              reset_profiles, # pylint: disable=W0613
                                              add_profile ):
  """Test for delete profile causing internal server error"""

  # Assign the profile from the fixture
  profile_to_delete = add_profile("new_profile.json")

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
