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

from fastapi import FastAPI, APIRouter, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
import json
from json import JSONDecodeError
import psutil
import threading
import uvicorn

from common import logger
from common.device import Device

LOGGER = logger.get_logger("api")

DEVICE_MAC_ADDR_KEY = "mac_addr"
DEVICE_MANUFACTURER_KEY = "manufacturer"
DEVICE_MODEL_KEY = "model"

class Api:
  """Provide REST endpoints to manage Test Run"""

  def __init__(self, test_run):

    self._test_run = test_run
    self._name = "TestRun API"
    self._router = APIRouter()

    self._session = self._test_run.get_session()

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
    self._router.add_api_route("/device", self.save_device, methods=["POST"])

    # TODO: Make this configurable in system.json
    origins = ["http://localhost:4200"]

    self._app = FastAPI()
    self._app.include_router(self._router)
    self._app.add_middleware(
      CORSMiddleware,
      allow_origins=origins,
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
    )

    self._api_thread = threading.Thread(target=self._start,
                                        name="Test Run API",
                                        daemon=True)

  def start(self):
    LOGGER.info("Starting API")
    self._api_thread.start()
    LOGGER.info("API waiting for requests")

  def _start(self):
    uvicorn.run(self._app, log_config=None, port=3000)

  def stop(self):
    LOGGER.info("Stopping API")

  async def get_sys_interfaces(self):
    addrs = psutil.net_if_addrs()
    ifaces = []
    for iface in addrs:
      ifaces.append(iface)
    return ifaces

  async def post_sys_config(self, request: Request, response: Response):
    try:
      config = (await request.body()).decode("UTF-8")
      config_json = json.loads(config)
      self._session.set_config(config_json)
    # Catch JSON Decode error etc
    except JSONDecodeError:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid JSON received")
    return self._session.get_config()

  async def get_sys_config(self):
    return self._session.get_config()

  async def get_devices(self):
    return self._session.get_device_repository()

  async def start_test_run(self, request: Request, response: Response):

    LOGGER.debug("Received start command")

    # Check request is valid
    body = (await request.body()).decode("UTF-8")
    body_json = None

    try:
      body_json = json.loads(body)
    except JSONDecodeError:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid JSON received")

    if "device" not in body_json or not (
      "mac_addr" in body_json["device"] and
      "firmware" in body_json["device"]):
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid request received")

    device = self._session.get_device(body_json["device"]["mac_addr"])
    device.firmware = body_json["device"]["firmware"]

    # Check Test Run is not already running
    if self._test_run.get_session().get_status() != "Idle":
      LOGGER.debug("Test Run is already running. Cannot start another instance")
      response.status_code = status.HTTP_409_CONFLICT
      return self._generate_msg(False, "Test Run is already running")

    # Check if requested device is known in the device repository
    if device is None:
      response.status_code = status.HTTP_404_NOT_FOUND
      return self._generate_msg(False,
                                "A device with that MAC address could not be found")

    # Check Test Run is able to start
    if self._test_run.get_net_orc().check_config() is False:
      response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
      return self._generate_msg(False,"Configured interfaces are not ready for use. Ensure required interfaces are connected.")

    self._test_run.get_session().set_target_device(device)
    LOGGER.info(f"Starting Test Run with device target {device.manufacturer} {device.model} with MAC address {device.mac_addr}")

    thread = threading.Thread(target=self._start_test_run,
                                        name="Test Run")
    thread.start()
    return self._test_run.get_session().to_json()

  def _generate_msg(self, success, message):
    msg_type = "success"
    if not success:
      msg_type = "error"
    return json.loads('{"' + msg_type + '": "' + message + '"}')

  def _start_test_run(self):
    self._test_run.start()

  async def stop_test_run(self):
    LOGGER.debug("Received stop command. Stopping Test Run")
    self._test_run.stop()
    return self._generate_msg(True, "Test Run stopped")

  async def get_status(self):
    return self._test_run.get_session().to_json()

  async def get_history(self):
    LOGGER.info("Returning previous Test Runs to UI")

  async def save_device(self, request: Request, response: Response):
    LOGGER.debug("Received device post request")

    try:
      device_raw = (await request.body()).decode("UTF-8")
      device_json = json.loads(device_raw)

      if not self._validate_device_json(device_json):
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(False, "Invalid request received")

      device = self._session.get_device(device_json.get(DEVICE_MAC_ADDR_KEY))
      if device is None:
        # Create new device
        device = Device()
        device.mac_addr = device_json.get(DEVICE_MAC_ADDR_KEY)
        response.status_code = status.HTTP_201_CREATED

      device.manufacturer = device_json.get(DEVICE_MANUFACTURER_KEY)
      device.model = device_json.get(DEVICE_MODEL_KEY)

      self._session.save_device(device)

      return device

    # Catch JSON Decode error etc
    except JSONDecodeError:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid JSON received")

  def _validate_device_json(self, json_obj):
    if not (DEVICE_MAC_ADDR_KEY in json_obj and
            DEVICE_MANUFACTURER_KEY in json_obj and
            DEVICE_MODEL_KEY in json_obj
    ):
      return False
    return True
