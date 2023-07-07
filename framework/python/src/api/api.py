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

from fastapi import FastAPI, APIRouter
import json
import os
import psutil
import threading
import uvicorn

from api.system_config import SystemConfig
from common import logger, util
from common.device import Device

LOGGER = logger.get_logger("api")
LOCAL_DEVICES_DIR = "local/devices"
RESOURCE_DEVICES_DIR = "resources/devices"
DEVICE_CONFIG = "device_config.json"
DEVICE_MANUFACTURER = "manufacturer"
DEVICE_MODEL = "model"
DEVICE_MAC_ADDR = "mac_addr"
DEVICE_TEST_MODULES = "test_modules"

class Api:
  """Provide REST endpoints to manage Test Run"""

  def __init__(self, test_run):

    self._test_run = test_run
    self._name = "TestRun API"
    self._router = APIRouter()

    self._devices = []
    self._config_file_url = self._test_run.get_config_file()

    self._router.add_api_route("/system/interfaces", self.get_sys_interfaces)
    self._router.add_api_route("/system/config", self.post_sys_config,
                              methods=["POST"])
    self._router.add_api_route("/system/config", self.get_sys_config)
    self._router.add_api_route("/devices", self.get_devices)

    self._app = FastAPI()
    self._app.include_router(self._router)

    self._api_thread = threading.Thread(target=self._start,
                                        name="Test Run API",
                                        daemon=True)

  def start(self):
    LOGGER.info("Starting API")
    self._api_thread.start()

  def _start(self):
    uvicorn.run(self._app, log_config=None)

  def stop(self):
    LOGGER.info("Stopping API")

  def load_all_devices(self):
    self._load_devices(device_dir=LOCAL_DEVICES_DIR)
    self._load_devices(device_dir=RESOURCE_DEVICES_DIR)
    return self._devices

  def _load_devices(self, device_dir):
    LOGGER.debug("Loading devices from " + device_dir)

    os.makedirs(device_dir, exist_ok=True)
    util.run_command(f"chown -R {util.get_host_user()} {device_dir}")

    for device_folder in os.listdir(device_dir):
      with open(os.path.join(device_dir, device_folder, DEVICE_CONFIG),
                encoding="utf-8") as device_config_file:
        device_config_json = json.load(device_config_file)

        device_manufacturer = device_config_json.get(DEVICE_MANUFACTURER)
        device_model = device_config_json.get(DEVICE_MODEL)
        mac_addr = device_config_json.get(DEVICE_MAC_ADDR)
        test_modules = device_config_json.get(DEVICE_TEST_MODULES)

        device = Device(manufacturer=device_manufacturer,
                        model=device_model,
                        mac_addr=mac_addr,
                        test_modules=test_modules)
        self._devices.append(device)

  async def get_sys_interfaces(self):
    addrs = psutil.net_if_addrs()
    ifaces = []
    for iface in addrs:
      ifaces.append(iface)
    return ifaces

  async def post_sys_config(self, sys_config: SystemConfig):

    config_file = open(self._config_file_url, "r", encoding="utf-8")
    json_contents = json.load(config_file)
    config_file.close()

    json_contents["network"]["device_intf"] = sys_config.network.device_intf
    json_contents["network"]["internet_intf"] = sys_config.network.internet_intf

    with open(self._config_file_url, "w", encoding="utf-8") as config_file:
      json.dump(json_contents, config_file, indent=2)

    return sys_config
  
  async def get_sys_config(self):
    config_file = open(self._config_file_url, "r", encoding="utf-8")
    json_contents = json.load(config_file)
    config_file.close()
    return json_contents

  async def get_devices(self):
    return self._devices
