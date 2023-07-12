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

from fastapi import FastAPI, APIRouter, Response, status
import json
import psutil
import threading
import uvicorn

from api.system_config import SystemConfig
from common import logger

LOGGER = logger.get_logger("api")

class Api:
  """Provide REST endpoints to manage Test Run"""

  def __init__(self, test_run):

    self._test_run = test_run
    self._name = "TestRun API"
    self._router = APIRouter()

    self._devices = self._test_run.get_devices()
    self._config_file_url = self._test_run.get_config_file()

    self._router.add_api_route("/system/interfaces", self.get_sys_interfaces)
    self._router.add_api_route("/system/config", self.post_sys_config,
                              methods=["POST"])
    self._router.add_api_route("/system/config", self.get_sys_config)
    self._router.add_api_route("/system/start", self.start_test_run,
                               methods=["POST"])
    self._router.add_api_route("/system/stop", self.stop_test_run,
                               methods=["POST"])
    self._router.add_api_route("/system/status", self.get_status)

    self._router.add_api_route("/devices", self.get_devices)

    self._app = FastAPI()
    self._app.include_router(self._router)

    self._api_thread = threading.Thread(target=self._start,
                                        name="Test Run API",
                                        daemon=True)

  def start(self):
    LOGGER.info("Starting API")
    self._api_thread.start()
    LOGGER.info("API waiting for requests")

  def _start(self):
    uvicorn.run(self._app, log_config=None)

  def stop(self):
    LOGGER.info("Stopping API")

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

  async def start_test_run(self, response: Response):
    LOGGER.debug("Received start command")
    if self._test_run.get_session().status != "Idle":
      LOGGER.debug("Test Run is already running. Cannot start another instance.")
      response.status_code = status.HTTP_409_CONFLICT
      return json.loads('{"error": "Test Run is already running"}')
    thread = threading.Thread(target=self._start_test_run,
                                        name="Test Run")
    thread.start()
    return json.loads('{"status": "Starting Test Run"}')

  def _start_test_run(self):
    self._test_run.start()

  async def stop_test_run(self):
    LOGGER.info("Received stop command. Stopping Test Run")

  async def get_status(self):
    return self._test_run.get_session()

  async def get_history(self):
    LOGGER.info("Returning previous Test Runs to UI")
