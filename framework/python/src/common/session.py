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

import datetime
import json
import os

NETWORK_KEY = 'network'
DEVICE_INTF_KEY = 'device_intf'
INTERNET_INTF_KEY = 'internet_intf'
RUNTIME_KEY = 'runtime'
MONITOR_PERIOD_KEY = 'monitor_period'
STARTUP_TIMEOUT_KEY = 'startup_timeout'
LOG_LEVEL_KEY = 'log_level'
MAX_DEVICE_REPORTS_KEY = 'max_device_reports'

class TestRunSession():
  """Represents the current session of Test Run."""

  def __init__(self, config_file):
    self._status = 'Idle'
    self._device = None
    self._started = None
    self._finished = None
    self._tests = []

    self._config_file = config_file

    self._config = self._get_default_config()
    self._load_config()

    self._device_repository = []

  def start(self):
    self._status = 'Starting'
    self._started = datetime.datetime.now()

  def get_started(self):
    return self._started

  def get_finished(self):
    return self._finished

  def _get_default_config(self):
    return {
      'network': {
        'device_intf': '',
        'internet_intf': ''
      },
      'log_level': 'INFO',
      'startup_timeout': 60,
      'monitor_period': 30,
      'runtime': 120,
      'max_device_reports': 5
    }

  def get_config(self):
    return self._config

  def _load_config(self):

    if not os.path.isfile(self._config_file):
      return

    with open(self._config_file, 'r', encoding='utf-8') as f:
      config_file_json = json.load(f)

      # Network interfaces
      if (NETWORK_KEY in config_file_json 
          and DEVICE_INTF_KEY in config_file_json.get(NETWORK_KEY)
          and INTERNET_INTF_KEY in config_file_json.get(NETWORK_KEY)):
        self._config[NETWORK_KEY][DEVICE_INTF_KEY] = config_file_json.get(NETWORK_KEY, {}).get(DEVICE_INTF_KEY)
        self._config[NETWORK_KEY][INTERNET_INTF_KEY] = config_file_json.get(NETWORK_KEY, {}).get(INTERNET_INTF_KEY)

      if RUNTIME_KEY in config_file_json:
        self._config[RUNTIME_KEY] = config_file_json.get(RUNTIME_KEY)

      if STARTUP_TIMEOUT_KEY in config_file_json:
        self._config[STARTUP_TIMEOUT_KEY] = config_file_json.get(STARTUP_TIMEOUT_KEY)

      if MONITOR_PERIOD_KEY in config_file_json:
        self._config[MONITOR_PERIOD_KEY] = config_file_json.get(MONITOR_PERIOD_KEY)

      if LOG_LEVEL_KEY in config_file_json:
        self._config[LOG_LEVEL_KEY] = config_file_json.get(LOG_LEVEL_KEY)

      if MAX_DEVICE_REPORTS_KEY in config_file_json:
        self._config[MAX_DEVICE_REPORTS_KEY] = config_file_json.get(MAX_DEVICE_REPORTS_KEY)

  def _save_config(self):
    with open(self._config_file, 'w', encoding='utf-8') as f:
      f.write(json.dumps(self._config, indent=2))

  def get_runtime(self):
    return self._config.get(RUNTIME_KEY)

  def get_log_level(self):
    return self._config.get(LOG_LEVEL_KEY)

  def get_device_interface(self):
    return self._config.get(NETWORK_KEY, {}).get(DEVICE_INTF_KEY)

  def get_internet_interface(self):
    return self._config.get(NETWORK_KEY, {}).get(INTERNET_INTF_KEY)

  def get_monitor_period(self):
    return self._config.get(MONITOR_PERIOD_KEY)

  def get_startup_timeout(self):
    return self._config.get(STARTUP_TIMEOUT_KEY)
  
  def get_max_device_reports(self):
    return self._config.get(MAX_DEVICE_REPORTS_KEY)

  def set_config(self, config_json):
    self._config = config_json
    self._save_config()

  def set_target_device(self, device):
    self._device = device

  def get_target_device(self):
    return self._device

  def get_device_repository(self):
    return self._device_repository

  def add_device(self, device):
    self._device_repository.append(device)

  def get_device(self, mac_addr):
    for device in self._device_repository:
      if device.mac_addr == mac_addr:
        return device
    return None

  def save_device(self, device):
    # TODO: We need to save the folder path of the device config
    return

  def get_status(self):
    return self._status

  def set_status(self, status):
    self._status = status

  def get_tests(self):
    return self._tests

  def reset(self):
    self.set_status('Idle')
    self.set_target_device(None)
    self._tests = []
    self._started = None
    self._finished = None

  def to_json(self):
    return {
      'status': self.get_status(),
      'device': self.get_target_device(),
      'started': self.get_started(),
      'finished': self.get_finished(),
      'tests': self.get_tests()
    }
