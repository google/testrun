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
# Temporarily disabled because using Pytest fixtures
# TODO refactor fixtures to not trigger error
# pylint: disable=redefined-outer-name

from collections.abc import Awaitable, Callable
import copy
import json
import os
from pathlib import Path
import re
import shutil
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

DEVICES_DIRECTORY = "../../local/devices"
TESTING_DEVICES = "../device_configs/"
SYSTEM_CONFIG_PATH = "../../local/system.json"

BASELINE_MAC_ADDR = "02:42:aa:00:01:01"
ALL_MAC_ADDR = "02:42:aa:00:00:01"


def pretty_print(dictionary: dict):
  print(json.dumps(dictionary, indent=4))


def query_system_status() -> str:
  """Query system status from API and returns this"""
  r = requests.get(f"{API}/system/status")
  response = json.loads(r.text)
  print(response)
  return response["status"]

def query_test_count() -> str:
  """Query system status from API and returns this"""
  r = requests.get(f"{API}/system/status")
  response = json.loads(r.text)
  print(response)
  return len(response["tests"]["results"])


def start_test_device(
    device_name, mac_address, image_name="ci_test_device1", args=""
):
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
  cmd = subprocess.run(
      f"docker stop {device_name}", shell=True, capture_output=True
  )
  print(cmd.stdout)
  cmd = subprocess.run(
      f"docker rm {device_name}", shell=True, capture_output=True
  )
  print(cmd.stdout)


def docker_logs(device_name):
  cmd = subprocess.run(
      f"docker logs {device_name}", shell=True, capture_output=True
  )
  print(cmd.stdout)


@pytest.fixture
def empty_devices_dir():
  local_delete_devices(ALL_DEVICES)


@pytest.fixture
def testing_devices():
  local_delete_devices(ALL_DEVICES)
  shutil.copytree(
      os.path.join(os.path.dirname(__file__), TESTING_DEVICES),
      os.path.join(os.path.dirname(__file__), DEVICES_DIRECTORY),
      dirs_exist_ok=True,
  )
  return local_get_devices()


@pytest.fixture
def testrun(request):
  test_name = request.node.originalname
  proc = subprocess.Popen(
      "bin/testrun",
      stdout=subprocess.PIPE,
      stderr=subprocess.STDOUT,
      encoding="utf-8",
      preexec_fn=os.setsid,
  )

  while True:
    try:
      outs, errs = proc.communicate(timeout=1)
    except subprocess.TimeoutExpired as e:
      if e.output is not None:
        output = e.output.decode("utf-8")
        if re.search("API waiting for requests", output):
          break
    except Exception as e:
      pytest.fail("testrun terminated")

  time.sleep(2)

  yield

  os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
  try:
    outs, errs = proc.communicate(timeout=60)
  except Exception as e:
    print(e.output)
    os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    pytest.exit(
        "waited 60s but test run did not cleanly exit .. terminating all tests"
    )

  print(outs)


  cmd = subprocess.run(
      f"docker stop $(docker ps -a -q)", shell=True, capture_output=True
  )
  print(cmd.stdout)
  cmd = subprocess.run(
      f"docker rm  $(docker ps -a -q)", shell=True, capture_output=True
  )
  print(cmd.stdout)

  


def until_true(func: Callable, message: str, timeout: int):
  expiry_time = time.time() + timeout
  while time.time() < expiry_time:
    if func():
      return True
    time.sleep(1)
  raise Exception(f"Timed out waiting {timeout}s for {message}")


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
  path = Path("/sys/class/net")
  return [i.stem for i in path.iterdir() if i.is_dir()]


def local_delete_devices(path):
  devices_path = os.path.join(os.path.dirname(__file__), DEVICES_DIRECTORY)
  for thing in Path(devices_path).glob(path):
    if thing.is_file():
      thing.unlink()
    else:
      shutil.rmtree(thing)


def local_get_devices():
  return sorted(
      Path(os.path.join(os.path.dirname(__file__), DEVICES_DIRECTORY)).glob(
          "*/device_config.json"
      )
  )


def test_get_system_interfaces(testrun):
  """Tests API system interfaces against actual local interfaces"""
  r = requests.get(f"{API}/system/interfaces")
  response = json.loads(r.text)
  local_interfaces = get_network_interfaces()
  assert set(response) == set(local_interfaces)

  # schema expects a flat list
  assert all([isinstance(x, str) for x in response])



def test_modify_device(testing_devices, testrun):
  with open(
      os.path.join(
          os.path.dirname(__file__), DEVICES_DIRECTORY, testing_devices[1]
      )
  ) as f:
    local_device = json.load(f)
  
  mac_addr = local_device["mac_addr"]
  new_model = "Alphabet"
  # get all devices
  r = requests.get(f"{API}/devices")
  all_devices = json.loads(r.text)

  api_device = next(x for x in all_devices if x["mac_addr"] == mac_addr)

  updated_device = copy.deepcopy(api_device)
  updated_device["model"] = new_model

  new_test_modules = {
      k: {"enabled": not v["enabled"]}
      for k, v in updated_device["test_modules"].items()
  }
  updated_device["test_modules"] = new_test_modules

  print("updated_device")
  pretty_print(updated_device)
  print("api_device")
  pretty_print(api_device)

  # update device
  r = requests.post(f"{API}/device", data=json.dumps(updated_device))

  assert r.status_code == 200

  r = requests.get(f"{API}/devices")
  all_devices = json.loads(r.text)
  updated_device_api = next(x for x in all_devices if x["mac_addr"] == mac_addr)

  assert updated_device_api["model"] == new_model
  assert updated_device_api["test_modules"] == new_test_modules

#@pytest.mark.timeout(1)
def test_create_get_devices(empty_devices_dir, testrun):
  # local_delete_devices(ALL_DEVICES)
  # We must start test run with no devices in local/devices for this test to function as expected!
  assert len(local_get_devices()) == 0

  # Test adding device
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

  r = requests.post(f"{API}/device", data=json.dumps(device_1))
  print(r.text)
  device1_response = r.text
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
  r = requests.post(f"{API}/device", data=json.dumps(device_2))
  device2_response = json.loads(r.text)
  assert r.status_code == 201
  assert len(local_get_devices()) == 2

  # Test that returned devices API endpoint matches expected structure
  r = requests.get(f"{API}/devices")
  all_devices = json.loads(r.text)
  pretty_print(all_devices)

  with open(
      os.path.join(os.path.dirname(__file__), "mockito/get_devices.json")
  ) as f:
    mockito = json.load(f)

  print(mockito)

  # Validate structure
  assert all([isinstance(x, dict) for x in all_devices])

  # TOOO uncomment when is done
  # assert set(dict_paths(mockito[0])) == set(dict_paths(all_devices[0]))

  # Validate contents of given keys matches
  for key in ["mac_addr", "manufacturer", "model"]:
    assert set([all_devices[0][key], all_devices[1][key]]) == set(
        [device_1[key], device_2[key]]
    )



def test_get_system_config(testrun):
  r = requests.get(f"{API}/system/config")

  with open(os.path.join(os.path.dirname(__file__), SYSTEM_CONFIG_PATH)) as f:
    local_config = json.load(f)

  api_config = json.loads(r.text)

  # validate structure
  assert set(dict_paths(api_config)) | set(dict_paths(local_config)) == set(
      dict_paths(api_config)
  )

  assert (
      local_config["network"]["device_intf"]
      == api_config["network"]["device_intf"]
  )
  assert (
      local_config["network"]["internet_intf"]
      == api_config["network"]["internet_intf"]
  )

#TODO change to invalod json or something
@pytest.mark.skip()
def test_invalid_path_get(testrun):
  r = requests.get(f"{API}/blah/blah")
  response = json.loads(r.text)
  assert r.status_code == 404
  with open(
      os.path.join(os.path.dirname(__file__), "mockito/invalid_request.json")
  ) as f:
    mockito = json.load(f)

  # validate structure
  assert set(dict_paths(mockito)) == set(dict_paths(response))


# @pytest.mark.skip()
def test_trigger_run(testing_devices, testrun):
  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload))
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
      900,
  )

  stop_test_device("x123")

  # Validate response
  r = requests.get(f"{API}/system/status")
  response = json.loads(r.text)
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
      )
  ) as f:
    mockito = json.load(f)

  # validate structure
  assert set(dict_paths(mockito)).issubset(set(dict_paths(response)))

  # Validate results structure
  assert set(dict_paths(mockito["tests"]["results"][0])).issubset(
      set(dict_paths(response["tests"]["results"][0]))
  )

  # Validate a result
  assert results["baseline.pass"]["result"] == "Compliant"


@pytest.mark.skip()
def test_stop_running_test(testing_devices, testrun):
  payload = {"device": {"mac_addr": ALL_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload))
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
  r = requests.post(f"{API}/system/stop")
  response = json.loads(r.text)
  pretty_print(response)
  assert response == {"success": "Test Run stopped"}
  time.sleep(1)
  # Validate response
  r = requests.get(f"{API}/system/status")
  response = json.loads(r.text)
  pretty_print(response)
  
  assert False
  assert len(response['results']['tests']) == response['results']['total']
  assert len(response['results']['tests']) < 15 
  assert response['status'] == 'Stopped???'

  # Validate structure
  with open(
      os.path.join(
          os.path.dirname(__file__), "mockito/running_system_status.json"
      )
  ) as f:
    mockito = json.load(f)

  # validate structure
  assert set(dict_paths(mockito)).issubset(set(dict_paths(response)))

  # Validate results structure
  assert set(dict_paths(mockito["tests"]["results"][0])).issubset(
      set(dict_paths(response["tests"]["results"][0]))
  )

@pytest.mark.skip()
def test_stop_running_not_running(testrun):
  # Validate response
  r = requests.post(f"{API}/system/stop")
  response = json.loads(r.text)
  pretty_print(response)

  assert False

  # V

@pytest.mark.skip()
def test_multiple_runs(testing_devices, testrun):
  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload))
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
  r = requests.get(f"{API}/system/status")
  response = json.loads(r.text)
  pretty_print(response)

  # Validate results
  results = {x["name"]: x for x in response["tests"]["results"]}
  print(results)
  # there are only 3 baseline tests
  assert len(results) == 3

  payload = {"device": {"mac_addr": BASELINE_MAC_ADDR, "firmware": "asd"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload))
  #assert r.status_code == 200
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
