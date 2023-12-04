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
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
from json import JSONDecodeError
import os
import psutil
import requests
import threading
import uvicorn

from common import logger
from common.device import Device

LOGGER = logger.get_logger("api")

DEVICE_MAC_ADDR_KEY = "mac_addr"
DEVICE_MANUFACTURER_KEY = "manufacturer"
DEVICE_MODEL_KEY = "model"
DEVICE_TEST_MODULES_KEY = "test_modules"
DEVICES_PATH = "/usr/local/testrun/local/devices"

LATEST_RELEASE_CHECK = "https://api.github.com/repos/google/testrun/releases/latest"

class Api:
  """Provide REST endpoints to manage Testrun"""

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

    self._router.add_api_route("/system/version", self.get_version)

    # Deprecated: /history will be removed in version 1.1
    self._router.add_api_route("/history", self.get_reports)

    self._router.add_api_route("/reports", self.get_reports)
    self._router.add_api_route("/report",
                               self.delete_report,
                               methods=["DELETE"])
    self._router.add_api_route("/report/{device_name}/{timestamp}",
                               self.get_report)

    self._router.add_api_route("/devices", self.get_devices)
    self._router.add_api_route("/device",
                               self.delete_device,
                               methods=["DELETE"])
    self._router.add_api_route("/device", self.save_device, methods=["POST"])

    # TODO: Make this configurable in system.json
    origins = ["http://localhost:8080", "http://localhost:4200"]

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
                                        name="Testrun API",
                                        daemon=True)

  def start(self):
    LOGGER.info("Starting API")
    self._api_thread.start()
    LOGGER.info("API waiting for requests")

  def _start(self):
    uvicorn.run(self._app, log_config=None, port=self._session.get_api_port())

  def stop(self):
    LOGGER.info("Stopping API")

  async def get_sys_interfaces(self):
    addrs = psutil.net_if_addrs()
    ifaces = []
    for iface in addrs:

      # Ignore any interfaces that are not ethernet
      if not iface.startswith("en"):
        continue

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

    # Check Testrun is not already running
    if self._test_run.get_session().get_status() in [
        "In Progress",
        "Waiting for Device",
        "Monitoring"
      ]:
      LOGGER.debug("Testrun is already running. Cannot start another instance")
      response.status_code = status.HTTP_409_CONFLICT
      return self._generate_msg(False, "Testrun is already running")

    # Check if requested device is known in the device repository
    if device is None:
      response.status_code = status.HTTP_404_NOT_FOUND
      return self._generate_msg(
        False,
        "A device with that MAC address could not be found")

    device.firmware = body_json["device"]["firmware"]

    # Check Testrun is able to start
    if self._test_run.get_net_orc().check_config() is False:
      response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
      return self._generate_msg(False,"Configured interfaces are not " +
                                "ready for use. Ensure required interfaces " +
                                "are connected.")

    LOGGER.info("Starting Testrun with device target " +
                f"{device.manufacturer} {device.model} with " +
                f"MAC address {device.mac_addr}")

    thread = threading.Thread(target=self._start_test_run,
                                        name="Testrun")
    thread.start()

    self._test_run.get_session().set_target_device(device)

    return self._test_run.get_session().to_json()

  def _generate_msg(self, success, message):
    msg_type = "success"
    if not success:
      msg_type = "error"
    return json.loads('{"' + msg_type + '": "' + message + '"}')

  def _start_test_run(self):
    self._test_run.start()

  async def stop_test_run(self):
    LOGGER.debug("Received stop command. Stopping Testrun")

    self._test_run.stop()

    return self._generate_msg(True, "Testrun stopped")

  async def get_status(self):
    return self._test_run.get_session().to_json()

  async def get_version(self, response: Response):
    json_response = {}

    # Obtain the current version
    current_version = self._session.get_version()

    # Check if current version was able to be obtained
    if current_version is None:
      response.status_code = 500
      return self._generate_msg(False, "Could not fetch current version")

    # Set the installed version
    json_response["installed_version"] = "v" + current_version

    # Check latest version number from GitHub API
    version_check = requests.get(LATEST_RELEASE_CHECK, timeout=5)

    # Check OK response was received
    if version_check.status_code != 200:
      response.status_code = 500
      return self._generate_msg(False, "Failed to fetch latest version")

    # Extract version number from response, removing the leading 'v'
    latest_version_no = version_check.json()["name"].strip("v")
    LOGGER.debug(f"Latest version available is {latest_version_no}")

    # Craft JSON response
    json_response["latest_version"] = "v" + latest_version_no
    json_response["latest_version_url"] = version_check.json()["html_url"]

    # String comparison between current and latest version
    if latest_version_no > current_version:
      json_response["update_available"] = True
      LOGGER.debug("An update is available")
    else:
      json_response["update_available"] = False
      LOGGER.debug("The latest version is installed")

    return json_response

  async def get_reports(self):
    LOGGER.debug("Received reports list request")
    return self._session.get_all_reports()

  async def delete_report(self, request: Request, response: Response):

    body_raw = (await request.body()).decode("UTF-8")

    if len(body_raw) == 0:
      response.status_code = 400
      return self._generate_msg(False, "Invalid request received")

    body_json = json.loads(body_raw)

    if "mac_addr" not in body_json or "timestamp" not in body_json:
      response.status_code = 400
      return self._generate_msg(False, "Invalid request received")

    mac_addr = body_json.get("mac_addr").lower()
    timestamp = body_json.get("timestamp")
    parsed_timestamp = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
    timestamp_formatted = parsed_timestamp.strftime("%Y-%m-%dT%H:%M:%S")

    # Get device from MAC address
    device = self._session.get_device(mac_addr)

    if device is None:
      response.status_code = 404
      return self._generate_msg(False, "Could not find device")

    if self._test_run.delete_report(device, timestamp_formatted):
      return self._generate_msg(True, "Deleted report")

    return self._generate_msg(False, "Error occured whilst deleting report")

  async def delete_device(self, request: Request, response: Response):

    LOGGER.debug("Received device delete request")

    try:

      # Extract MAC address from request body
      device_raw = (await request.body()).decode("UTF-8")
      device_json = json.loads(device_raw)

      # Validate that mac_addr has been specified in the body
      if "mac_addr" not in device_json:
        response.status_code = 400
        return self._generate_msg(False, "Invalid request received")

      mac_addr = device_json.get("mac_addr").lower()

      # Check that device exists
      device = self._test_run.get_session().get_device(mac_addr)

      if device is None:
        response.status_code = 404
        return self._generate_msg(False, "Device not found")

      # Check that Testrun is not currently running against this device
      if self._session.get_target_device() == device:
        # TODO: Check if this is the correct status code
        response.status_code = 403
        return self._generate_msg(False, "Cannot delete this device whilst " +
                                  "it is being tested")

      # Delete device
      self._test_run.delete_device(device)

      # Return success response
      response.status_code = 200
      return self._generate_msg(True, "Successfully deleted the device")

    # TODO: Find specific exception to catch
    except Exception as e:
      LOGGER.error(e)
      response.status_code = 500
      return self._generate_msg(False, "An error occured whilst deleting " +
                                "the device")

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
        device.mac_addr = device_json.get(DEVICE_MAC_ADDR_KEY).lower()
        device.manufacturer = device_json.get(DEVICE_MANUFACTURER_KEY)
        device.model = device_json.get(DEVICE_MODEL_KEY)
        device.device_folder = device.manufacturer + " " + device.model
        device.test_modules = device_json.get(DEVICE_TEST_MODULES_KEY)

        self._test_run.create_device(device)
        response.status_code = status.HTTP_201_CREATED

      else:

        self._test_run.save_device(device, device_json)
        response.status_code = status.HTTP_200_OK

      return device.to_config_json()

    # Catch JSON Decode error etc
    except JSONDecodeError:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid JSON received")

  async def get_report(self, response: Response,
                       device_name, timestamp):

    file_path = os.path.join(DEVICES_PATH, device_name, "reports",
                             timestamp, "report.pdf")
    LOGGER.debug(f"Received get report request for {device_name} / {timestamp}")
    if os.path.isfile(file_path):
      return FileResponse(file_path)
    else:
      LOGGER.info("Report could not be found, returning 404")
      response.status_code = 404
      return self._generate_msg(False, "Report could not be found")

  def _validate_device_json(self, json_obj):

    # Check all required properties are present
    if not (DEVICE_MAC_ADDR_KEY in json_obj and
            DEVICE_MANUFACTURER_KEY in json_obj and
            DEVICE_MODEL_KEY in json_obj
    ):
      return False

    # Check length of strings
    if len(json_obj.get(DEVICE_MANUFACTURER_KEY)) > 64 or len(
      json_obj.get(DEVICE_MODEL_KEY)) > 64:
      return False

    disallowed_chars = ["/", "\\", "\'", "\"", ";"]
    for char in json_obj.get(DEVICE_MANUFACTURER_KEY):
      if char in disallowed_chars:
        return False

    for char in json_obj.get(DEVICE_MODEL_KEY):
      if char in disallowed_chars:
        return False

    return True
