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

import json
import os
from pathlib import Path
import re
import shutil
import pytest
import requests
import subprocess
import signal
import time

ALL_DEVICES = "*"
API = "http://127.0.0.1:8000"
LOG_PATH = "/tmp/testrun.log"
TEST_SITE_DIR = ".."

DEVICES_DIRECTORY = "../../local/devices"

@pytest.fixture
def empty_devices_dir():
  local_delete_devices(ALL_DEVICES)

@pytest.fixture
def testrun(request):
  test_name = request.node.originalname
  proc = subprocess.Popen("bin/testrun", stdout=subprocess.PIPE, stderr=subprocess.STDOUT, encoding="utf-8", preexec_fn=os.setsid)

  while True:
    try:
      outs, errs = proc.communicate(timeout=1)
    except subprocess.TimeoutExpired as e:
      if e.output is not None:
        output = e.output.decode('utf-8')
        if re.search('API waiting for requests', output):
          break
    except Exception as e:
      pytest.fail("testrun terminated")

  time.sleep(2)

  yield

  os.killpg(os.getpgid(proc.pid), signal.SIGTERM) 
  try:
      outs, errs = proc.communicate(timeout=5)
  except Exception as e:
      print(e.output)
      pytest.exit("test run did not cleanly exit .. terminating all tests")
  print(outs)
  
def dict_paths(thing, stem=""):
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


def test_get_system_interfaces(empty_devices_dir, testrun):
  """Tests API system interfaces against actual local interfaces"""
  r = requests.get(f"{API}/system/interfaces")
  response = json.loads(r.text)
  local_interfaces = get_network_interfaces()
  assert set(response) == set(local_interfaces)

  # schema expects a flat list
  assert all([isinstance(x, str) for x in response])


@pytest.mark.skip()
def test_create_and_get_device():
  pass


def test_create_modify_get_devices(testrun):
  # local_delete_devices(ALL_DEVICES)
  # We must start test run with no devices in local/devices for this test to function as expected!
  assert len(local_get_devices()) == 0

  # Test adding device
  device_1 = {
      "manufacturer": "Google",
      "model": "First",
      "mac_addr": "00:1e:42:35:73:c4",
      "test_modules": {
        "dns": {
          "enabled": True
        },
        "connection": {
          "enabled": True
        },
        "ntp": {
          "enabled": True
        },
        "baseline": {
          "enabled": True
        },
        "nmap": {
          "enabled": True
        }
      }
  }

  r = requests.post(f"{API}/device", data=json.dumps(device_1))
  device1_response = r.text
  assert r.status_code == 201
  assert len(local_get_devices()) == 1

  device_2 = {
      "manufacturer": "Google",
      "model": "Second",
      "mac_addr": "00:1e:42:35:73:c6",
      "test_modules": {
        "dns": {
          "enabled": True
        },
        "connection": {
          "enabled": True
        },
        "ntp": {
          "enabled": True
        },
        "baseline": {
          "enabled": True
        },
        "nmap": {
          "enabled": True
        }
      }
  }
  r = requests.post(f"{API}/device", data=json.dumps(device_2))
  device2_response = json.loads(r.text)
  assert r.status_code == 201
  assert len(local_get_devices()) == 2

  # Test that returned devices API endpoint matches expected structure
  r = requests.get(f"{API}/devices")
  all_devices = json.loads(r.text)
  print(json.dumps(all_devices, indent=4))

  with open(
      os.path.join(os.path.dirname(__file__), "mockito/get_devices.json")
  ) as f:
    mockito = json.load(f)

  print(mockito)
  
  # Validate structure
  assert all([isinstance(x, dict) for x in all_devices])
  assert set(dict_paths(mockito[0])) == set(dict_paths(all_devices[0]))

  # Validate contents of given keys matches
  for key in ['mac_addr', 'manufacturer', 'model']:
    assert set([all_devices[0][key], all_devices[1][key]])  == set([device_1[key], device_2[key]])

  assert False


@pytest.mark.skip()
def test_get_devices():
  r = requests.get(f"{API}/devices")
  print(r.text)
  print(r.headers)
  assert False


@pytest.mark.skip()
def test_get_devices_when_none_exist():
  # Delete the devices
  r = requests.get(f"{API}/devices")
  print(r.text)
  print(r.headers)
  assert False


@pytest.mark.skip()
def test_get_system_config():
  r = requests.get(f"{API}/system/config")
  print(r.text)
  print(r.headers)
  assert False


@pytest.mark.skip()
def test_invalid_path_get():
  r = requests.get(f"{API}/blah/blah")
  print(r.status_code)
  print(r.text)
  print(r.headers)
  assert False


@pytest.mark.skip()
def test_trigger_run():
  payload = {"device": {"mac_addr": "aa:bb:cc:dd:ee:ff"}}
  r = requests.post(f"{API}/system/start", data=json.dumps(payload))
  print(r.status_code)
  print(r.text)
  print(r.headers)
  assert False
