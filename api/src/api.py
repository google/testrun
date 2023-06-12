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

import json
import os

from device import Device

DEVICES_DIR = "/devices"
DEVICE_CONFIG_FILE = "device_config.json"

DEVICE_MAC_ADDR_KEY = "mac_addr"
DEVICE_MANUFACTURER_KEY = "manufacturer"
DEVICE_MODEL_KEY = "model"

class Api():

  def __init__(self):
    self._devices = []

    self._load_devices()

  def _load_devices(self):

    print(f"Loading devices from {DEVICES_DIR}")

    for device_name in os.listdir(DEVICES_DIR):
      device_file = os.path.join(DEVICES_DIR, device_name, DEVICE_CONFIG_FILE)

      with open(device_file, encoding="utf-8") as device_config:
        device_config_json = json.load(device_config)

        device = Device(device_config_json[DEVICE_MAC_ADDR_KEY])

        if DEVICE_MANUFACTURER_KEY in device_config_json:
          device.manufacturer = device_config_json[DEVICE_MANUFACTURER_KEY]

        if DEVICE_MODEL_KEY in device_config_json:
          device.model = device_config_json[DEVICE_MODEL_KEY]

        self._devices.append(device)

    print(f"Loaded {len(self._devices)} devices")

  def get_devices(self):
    return self._devices
