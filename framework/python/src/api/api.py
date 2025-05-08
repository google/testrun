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
"""Provides Testrun data via REST API."""
from fastapi import (FastAPI, APIRouter, Response, Request, status, UploadFile)
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from datetime import datetime
import json
from json import JSONDecodeError
import os
import psutil
import requests
import signal
import threading
import uvicorn

from core import tasks
from common import logger
from common.device import Device
from common.statuses import TestrunStatus

LOGGER = logger.get_logger("api")

DEVICE_MAC_ADDR_KEY = "mac_addr"
DEVICE_MANUFACTURER_KEY = "manufacturer"
DEVICE_MODEL_KEY = "model"
DEVICE_TEST_MODULES_KEY = "test_modules"
DEVICE_TEST_PACK_KEY = "test_pack"
DEVICE_TYPE_KEY = "type"
DEVICE_TECH_KEY = "technology"
DEVICE_ADDITIONAL_INFO_KEY = "additional_info"

DEVICES_PATH = "local/devices"
PROFILES_PATH = "local/risk_profiles"

RESOURCES_PATH = "resources"
DEVICE_FOLDER_PATH = "devices"
DEVICE_QUESTIONS_FILE_NAME = "device_profile.json"

LATEST_RELEASE_CHECK = ("https://api.github.com/repos/google/" +
                        "testrun/releases/latest")


class Api:
  """Provide REST endpoints to manage Testrun"""

  def __init__(self, testrun):

    self._testrun = testrun
    self._name = "Testrun API"
    self._router = APIRouter()

    # Load static JSON resources
    device_resources = os.path.join(self._testrun.get_root_dir(),
                                RESOURCES_PATH,
                                DEVICE_FOLDER_PATH)

    # Load device profile questions
    self._device_profile = self._load_json(device_resources,
                                           DEVICE_QUESTIONS_FILE_NAME)

    # Fetch Testrun session
    self._session = self._testrun.get_session()

    # System endpoints
    self._router.add_api_route("/system/interfaces", self.get_sys_interfaces)
    self._router.add_api_route("/system/config",
                               self.post_sys_config,
                               methods=["POST"])
    self._router.add_api_route("/system/config", self.get_sys_config)
    self._router.add_api_route("/system/start",
                               self.start_testrun,
                               methods=["POST"])
    self._router.add_api_route("/system/stop",
                               self.stop_testrun,
                               methods=["POST"])
    self._router.add_api_route("/system/status", self.get_status)
    self._router.add_api_route("/system/shutdown",
                               self.shutdown,
                               methods=["POST"])
    self._router.add_api_route("/system/version", self.get_version)
    self._router.add_api_route("/system/modules", self.get_test_modules)
    self._router.add_api_route("/system/testpacks", self.get_test_packs)

    # Report endpoints
    self._router.add_api_route("/reports", self.get_reports)
    self._router.add_api_route("/report",
                               self.delete_report,
                               methods=["DELETE"])
    self._router.add_api_route("/report/{device_name}/{timestamp}",
                               self.get_report)
    self._router.add_api_route("/export/{device_name}/{timestamp}",
                               self.get_results,
                               methods=["POST"])

    # Device endpoints
    self._router.add_api_route("/devices", self.get_devices)
    self._router.add_api_route("/device",
                               self.delete_device,
                               methods=["DELETE"])
    self._router.add_api_route("/device", self.save_device, methods=["POST"])
    self._router.add_api_route("/device/edit",
                               self.edit_device,
                               methods=["POST"])
    self._router.add_api_route("/devices/format", self.get_devices_profile)

    # Certificate endpoints
    self._router.add_api_route("/system/config/certs", self.get_certs)
    self._router.add_api_route("/system/config/certs",
                               self.upload_cert,
                               methods=["POST"])
    self._router.add_api_route("/system/config/certs",
                               self.delete_cert,
                               methods=["DELETE"])

    # Profiles
    self._router.add_api_route("/profiles/format", self.get_profiles_format)
    self._router.add_api_route("/profiles", self.get_profiles)
    self._router.add_api_route("/profiles",
                               self.update_profile,
                               methods=["POST"])
    self._router.add_api_route("/profiles",
                               self.delete_profile,
                               methods=["DELETE"])
    self._router.add_api_route("/profile/{profile_name}",
                               self.export_profile,
                               methods=["POST"])

    # Allow all origins to access the API
    origins = ["*"]

    # Scheduler for background periodic tasks
    self._scheduler = tasks.PeriodicTasks(self._testrun)

    # Init FastAPI
    self._app = FastAPI(lifespan=self._scheduler.start)

    # Attach router to FastAPI
    self._app.include_router(self._router)

    # Attach CORS middleware
    self._app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Use separate thread for API
    self._api_thread = threading.Thread(target=self._start,
                                        name="Testrun API",
                                        daemon=True)

  def _load_json(self, directory, file_name):
    """Utility method to load json files' """
    # Construct the base path relative to the main folder
    root_dir = self._testrun.get_root_dir()

    # Construct the full file path
    file_path = os.path.join(root_dir, directory, file_name)

    # Open the file in read mode
    with open(file_path, "r", encoding="utf-8") as file:
      # Return the file content
      return json.load(file)

  def _get_testrun(self):
    return self._testrun

  def start(self):
    LOGGER.info("Starting API")
    self._api_thread.start()
    LOGGER.info("API waiting for requests")

  def _start(self):
    uvicorn.run(self._app,
                log_config=None,
                host="0.0.0.0",
                port=self._session.get_api_port())

  def stop(self):
    LOGGER.info("Stopping API")

  def get_session(self):
    return self._session

  async def get_sys_interfaces(self):
    addrs = psutil.net_if_addrs()
    ifaces = {}

    # pylint: disable=consider-using-dict-items
    for key in addrs.keys():
      nic = addrs[key]

      # Ignore any interfaces that are not ethernet
      if not (key.startswith("en") or key.startswith("eth")):
        continue

      ifaces[key] = nic[0].address

    return ifaces

  async def post_sys_config(self, request: Request, response: Response):
    try:
      config = (await request.body()).decode("UTF-8")
      config_json = json.loads(config)

      # Validate req fields
      if ("network" not in config_json or
          "device_intf" not in config_json.get("network") or
          "internet_intf" not in config_json.get("network") or
        "log_level" not in config_json):
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(
          False,
          "Configuration is missing required fields")

      self._session.set_config(config_json)

    # Catch JSON Decode error etc
    except JSONDecodeError:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid JSON received")
    return self._session.get_config()

  async def get_sys_config(self):
    return self._session.get_config()

  async def get_devices(self):
    devices = []
    for device in self._session.get_device_repository():
      devices.append(device.to_dict())
    return devices

  async def start_testrun(self, request: Request, response: Response):

    LOGGER.debug("Received start command")

    # Check request is valid
    body = (await request.body()).decode("UTF-8")
    body_json = None

    try:
      body_json = json.loads(body)
    except JSONDecodeError:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid JSON received")

    if "device" not in body_json or not ("mac_addr" in body_json["device"]
                                         and "firmware" in body_json["device"]):
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid request received")

    device = self._session.get_device(body_json["device"]["mac_addr"])

    # Check if requested device is known in the device repository
    if device is None:
      response.status_code = status.HTTP_404_NOT_FOUND
      return self._generate_msg(
          False, "A device with that MAC address could not be found")

    # Check if device is fully configured
    if device.status != "Valid":
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Device configuration is not complete")

    # Check Testrun is not already running
    if self._testrun.get_session().get_status() in [
        TestrunStatus.IN_PROGRESS,
        TestrunStatus.WAITING_FOR_DEVICE,
        TestrunStatus.MONITORING,
        TestrunStatus.VALIDATING,
        TestrunStatus.STARTING

    ]:
      LOGGER.debug("Testrun is already running. Cannot start another instance")
      response.status_code = status.HTTP_409_CONFLICT
      return self._generate_msg(
          False, "Testrun cannot be started " +
          "whilst a test is running on another device")

    device.firmware = body_json["device"]["firmware"]

    # Check if config has been updated (device interface not default)
    if (self._testrun.get_session().get_device_interface() ==
        ""):
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(
          False, "Testrun configuration has not yet " + "been completed.")

    # Check Testrun is able to start
    if self._testrun.get_net_orc().check_config() is False:
      response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
      return self._generate_msg(
          False, "Configured interfaces are not " +
          "ready for use. Ensure required interfaces " + "are connected.")

    # UI doesn't send individual test configs so we need to
    # merge these manually until the UI is updated to handle
    # the full config file
    for module_name, module_config in device.test_modules.items():
      # Check if the module exists in UI test modules
      if module_name in body_json["device"]["test_modules"]:
        # Merge the enabled state
        module_config["enabled"] = body_json[
          "device"]["test_modules"][module_name]["enabled"]

    LOGGER.info("Starting Testrun with device target " +
                f"{device.manufacturer} {device.model} with " +
                f"MAC address {device.mac_addr}")

    thread = threading.Thread(target=self._start_testrun, name="Testrun")
    thread.start()

    self._testrun.get_session().set_target_device(device)

    return self._testrun.get_session().to_json()

  def _generate_msg(self, success, message):
    msg_type = "success"
    if not success:
      msg_type = "error"
    return json.loads('{"' + msg_type + '": "' + message + '"}')

  def _start_testrun(self):
    self._testrun.start()

  async def stop_testrun(self, response: Response):
    LOGGER.debug("Received stop command")

    # Check if Testrun is running
    if (self._testrun.get_session().get_status()
        not in [TestrunStatus.IN_PROGRESS,
                TestrunStatus.WAITING_FOR_DEVICE,
                TestrunStatus.MONITORING,
                TestrunStatus.VALIDATING,
                TestrunStatus.STARTING]):
      response.status_code = 404
      return self._generate_msg(False, "Testrun is not currently running")

    # Launch stop in the background
    asyncio.create_task(self._run_stop())

    # Return response immediately
    return self._generate_msg(True, "Testrun stop initiated")

  async def _run_stop(self):
    try:
      await self._testrun.stop()  # Assuming .stop is async
    except Exception as e:
      LOGGER.exception("Error while stopping testrun: %s", e)

  async def get_status(self):
    return self._testrun.get_session().to_json()

  def shutdown(self, response: Response):

    LOGGER.debug("Received request to shutdown Testrun")

    # Check that Testrun is not currently running
    if (self._session.get_status()
        not in [TestrunStatus.CANCELLED,
                TestrunStatus.PROCEED,
                TestrunStatus.DO_NOT_PROCEED,
                TestrunStatus.COMPLETE,
                TestrunStatus.IDLE
                ]):
      LOGGER.debug("Unable to shutdown Testrun as Testrun is in progress")
      response.status_code = 400
      return self._generate_msg(
          False, "Unable to shutdown. A test is currently in progress.")

    self._testrun.shutdown()
    os.kill(os.getpid(), signal.SIGTERM)

  async def get_version(self, response: Response):

    # Add defaults
    json_response = {}
    json_response["installed_version"] = "v" + self._testrun.get_version()
    json_response["update_available"] = False
    json_response["latest_version"] = None
    json_response["latest_version_url"] = (
        "https://github.com/google/testrun/releases")

    # Obtain the current version
    current_version = self._session.get_version()

    # Check if current version was able to be obtained
    if current_version is None:
      response.status_code = 500
      return self._generate_msg(False, "Could not fetch current version")

    # Set the installed version
    json_response["installed_version"] = "v" + current_version

    # Check latest version number from GitHub API
    try:
      version_check = requests.get(LATEST_RELEASE_CHECK, timeout=5)

      # Check OK response was received
      if version_check.status_code != 200:
        LOGGER.debug(version_check.content)
        LOGGER.error("Failed to fetch latest version")
        response.status_code = 200
        return json_response

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
    except Exception as e: # pylint: disable=W0703
      response.status_code = 200
      LOGGER.error("Failed to fetch latest version")
      LOGGER.debug(e)
      return json_response

  async def get_reports(self, request: Request):
    LOGGER.debug("Received reports list request")
    # Resolve the server IP from the request so we
    # can fix the report URL
    reports = self._session.get_all_reports()
    for report in reports:
      # report URL is currently hard coded as localhost so we can
      # replace that to fix the IP dynamically from the requester
      report["report"] = report["report"].replace(
        "localhost", request.client.host)
      report["export"] = report["report"].replace("report", "export")
    return reports

  async def delete_report(self, request: Request, response: Response):

    body_raw = (await request.body()).decode("UTF-8")

    if len(body_raw) == 0:
      response.status_code = 400
      return self._generate_msg(False, "Invalid request received, missing body")

    try:
      body_json = json.loads(body_raw)
    except JSONDecodeError as e:
      LOGGER.error("An error occurred whilst decoding JSON")
      LOGGER.debug(e)
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid request received")

    if "mac_addr" not in body_json or "timestamp" not in body_json:
      response.status_code = 400
      return self._generate_msg(False, "Missing mac address or timestamp")

    mac_addr = body_json.get("mac_addr").lower()
    timestamp = body_json.get("timestamp")

    try:
      parsed_timestamp = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
      timestamp_formatted = parsed_timestamp.strftime("%Y-%m-%dT%H:%M:%S")

    except ValueError:
      response.status_code = 400
      return self._generate_msg(False, "Incorrect timestamp format")

    # Get device from MAC address
    device = self._session.get_device(mac_addr)

    if device is None:
      response.status_code = 404
      return self._generate_msg(False, "Could not find device")

    # Assign the reports folder path from testrun
    reports_folder = self._testrun.get_reports_folder(device)

    # Check if reports folder exists
    if not os.path.exists(reports_folder):
      response.status_code = 404
      return self._generate_msg(False, "Report not found")

    if self._testrun.delete_report(device, timestamp_formatted):
      return self._generate_msg(True, "Deleted report")

    response.status_code = 500
    return self._generate_msg(False, "Error occurred whilst deleting report")

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
      device = self._testrun.get_session().get_device(mac_addr)

      if device is None:
        response.status_code = 404
        return self._generate_msg(False, "Device not found")

      # Check that Testrun is not currently running against this device
      if (self._session.get_target_device() == device
          and self._session.get_status()
          not in [TestrunStatus.CANCELLED,
                  TestrunStatus.COMPLETE,
                  TestrunStatus.PROCEED,
                  TestrunStatus.DO_NOT_PROCEED
                  ]):

        response.status_code = 403
        return self._generate_msg(
            False, "Cannot delete this device whilst it is being tested")

      # Delete device
      self._testrun.delete_device(device)

      # Return success response
      response.status_code = 200
      return self._generate_msg(True, "Successfully deleted the device")

    # TODO: Find specific exception to catch
    except Exception as e:  # pylint: disable=W0703
      LOGGER.error(e)
      response.status_code = 500
      return self._generate_msg(
          False, "An error occurred whilst deleting the device")

  async def save_device(self, request: Request, response: Response):
    LOGGER.debug("Received device post request")

    try:
      device_raw = (await request.body()).decode("UTF-8")
      device_json = json.loads(device_raw)

      if not self._validate_device_json(device_json):
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(False, "Invalid request received")

      # Check if device with same MAC exists
      device = self._session.get_device(device_json.get(DEVICE_MAC_ADDR_KEY))

      if device is not None:

        response.status_code = status.HTTP_409_CONFLICT
        return self._generate_msg(
            False, "A device with that MAC address already exists")

      # Check if device with same manufacturer and model exists
      device = self._session.get_device_by_make_and_model(
        device_json.get(DEVICE_MANUFACTURER_KEY),
        device_json.get(DEVICE_MODEL_KEY)
      )

      # Check if device folder exists
      device_folder = os.path.join(self._testrun.get_root_dir(),
                                     DEVICES_PATH,
                                     device_json.get(DEVICE_MANUFACTURER_KEY) +
                                     " " +
                                     device_json.get(DEVICE_MODEL_KEY))

      if os.path.exists(device_folder):
        response.status_code = status.HTTP_409_CONFLICT
        return self._generate_msg(
            False, "A folder with that name already exists, " \
              "please rename the device or folder")

      if device is None:

        # Create new device
        device = Device()
        device.mac_addr = device_json.get(DEVICE_MAC_ADDR_KEY).lower()
        device.manufacturer = device_json.get(DEVICE_MANUFACTURER_KEY)
        device.model = device_json.get(DEVICE_MODEL_KEY)
        device.test_pack = device_json.get(DEVICE_TEST_PACK_KEY)
        device.type = device_json.get(DEVICE_TYPE_KEY)
        device.technology = device_json.get(DEVICE_TECH_KEY)
        device.additional_info = device_json.get(DEVICE_ADDITIONAL_INFO_KEY)

        device.device_folder = device.manufacturer + " " + device.model
        device.test_modules = device_json.get(DEVICE_TEST_MODULES_KEY)

        self._testrun.create_device(device)
        response.status_code = status.HTTP_201_CREATED

      else:

        response.status_code = status.HTTP_409_CONFLICT
        return self._generate_msg(
            False, "A device with that manufacturer and model already exists")

      return device.to_config_json()

    # Catch JSON Decode error etc
    except JSONDecodeError:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid JSON received")

  async def edit_device(self, request: Request, response: Response):

    LOGGER.debug("Received device edit request")

    try:
      req_raw = (await request.body()).decode("UTF-8")
      req_json = json.loads(req_raw)

      # Validate top level fields
      if not (DEVICE_MAC_ADDR_KEY in req_json and "device" in req_json):
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(False, "Invalid request received")

      # Extract device information from request
      device_json = req_json.get("device")

      if not self._validate_device_json(device_json):
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(False, "Invalid request received")

      # Get device from old MAC address
      device = self._session.get_device(req_json.get(DEVICE_MAC_ADDR_KEY))

      # Check if device exists
      if device is None:
        response.status_code = status.HTTP_404_NOT_FOUND
        return self._generate_msg(
            False, "A device with that MAC address could not be found")

      if (self._session.get_target_device() == device
          and self._session.get_status()
          not in [TestrunStatus.CANCELLED,
                  TestrunStatus.COMPLETE,
                  TestrunStatus.PROCEED,
                  TestrunStatus.DO_NOT_PROCEED
                  ]):
        response.status_code = 403
        return self._generate_msg(
            False, "Cannot edit this device whilst it is being tested")

      # Check if a device exists with the new MAC address
      check_new_device = self._session.get_device(
          device_json.get(DEVICE_MAC_ADDR_KEY))

      if not check_new_device is None and (device.mac_addr
                                           != check_new_device.mac_addr):
        response.status_code = status.HTTP_409_CONFLICT
        return self._generate_msg(
            False, "A device with that MAC address already exists")

      # Update the device
      device.mac_addr = device_json.get(DEVICE_MAC_ADDR_KEY).lower()
      device.manufacturer = device_json.get(DEVICE_MANUFACTURER_KEY)
      device.model = device_json.get(DEVICE_MODEL_KEY)
      device.test_pack = device_json.get(DEVICE_TEST_PACK_KEY)
      device.type = device_json.get(DEVICE_TYPE_KEY)
      device.technology = device_json.get(DEVICE_TECH_KEY)
      device.additional_info = device_json.get(DEVICE_ADDITIONAL_INFO_KEY)
      device.test_modules = device_json.get(DEVICE_TEST_MODULES_KEY)

      # Update device status to valid now that configuration is complete
      device.status = "Valid"

      self._testrun.save_device(device)
      response.status_code = status.HTTP_200_OK

      return device.to_config_json()

    # Catch JSON Decode error etc
    except JSONDecodeError:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid JSON received")

  async def get_report(self, response: Response, device_name, timestamp):
    device = self._session.get_device_by_name(device_name)

    # If the device not found
    if device is None:
      LOGGER.info("Device not found, returning 404")
      response.status_code = 404
      return self._generate_msg(False, "Device not found")

    # Regenerate the pdf if the device profile has been updated
    self._get_testrun().get_test_orc().regenerate_pdf(device, timestamp)

    # 1.3 file path
    file_path = os.path.join(
      DEVICES_PATH,
      device_name,
      "reports",
      timestamp,"test",
          device.mac_addr.replace(":",""),
          "report.pdf")
    if not os.path.isfile(file_path):
      # pre 1.3 file path
      file_path = os.path.join(DEVICES_PATH, device_name, "reports", timestamp,
                             "report.pdf")

    LOGGER.debug(f"Received get report request for {device_name} / {timestamp}")
    if os.path.isfile(file_path):
      return FileResponse(file_path)
    else:
      LOGGER.info("Report could not be found, returning 404")
      response.status_code = 404
      return self._generate_msg(False, "Report could not be found")

  async def get_results(self, request: Request, response: Response, device_name,
                        timestamp):
    LOGGER.debug("Received get results " +
                 f"request for {device_name} / {timestamp}")

    profile = None

    try:
      req_raw = (await request.body()).decode("UTF-8")
      req_json = json.loads(req_raw)

      # Check if profile has been specified
      if "profile" in req_json and len(req_json.get("profile")) > 0:
        profile_name = req_json.get("profile")
        profile = self.get_session().get_profile(profile_name)

        if profile is None:
          response.status_code = status.HTTP_404_NOT_FOUND
          return self._generate_msg(
              False, "A profile with that name could not be found")

    except JSONDecodeError:
      # Profile not specified
      pass

    # Check if device exists
    device = self.get_session().get_device_by_name(device_name)
    if device is None:
      response.status_code = status.HTTP_404_NOT_FOUND
      return self._generate_msg(False,
                                "A device with that name could not be found")

    # Check if report exists (1.3 file path)
    report_file_path = os.path.join(
      DEVICES_PATH,
      device_name,
      "reports",
      timestamp,"test",
          device.mac_addr.replace(":",""))

    if not os.path.isdir(report_file_path):
      # pre 1.3 file path
      report_file_path = os.path.join(DEVICES_PATH, device_name, "reports",
                                                    timestamp)

    if not os.path.isdir(report_file_path):
      LOGGER.info("Report could not be found, returning 404")
      response.status_code = 404
      return self._generate_msg(False, "Report could not be found")

    zip_file_path = self._get_testrun().get_test_orc().zip_results(
        device, timestamp, profile)

    if zip_file_path is None:
      response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
      return self._generate_msg(
          False, "An error occurred whilst archiving test results")

    if os.path.isfile(zip_file_path):
      return FileResponse(zip_file_path)
    else:
      LOGGER.info("Test results could not be found, returning 404")
      response.status_code = 404
      return self._generate_msg(False, "Test results could not be found")

  async def get_devices_profile(self):
    """Device profile questions"""
    return self._device_profile

  def _validate_device_json(self, json_obj):

    # Check all required properties are present
    for string in [
      DEVICE_MAC_ADDR_KEY,
      DEVICE_MANUFACTURER_KEY,
      DEVICE_MODEL_KEY,
      DEVICE_TYPE_KEY,
      DEVICE_TECH_KEY,
      DEVICE_ADDITIONAL_INFO_KEY
    ]:
      if string not in json_obj:
        LOGGER.error(f"Missing required key {string} in device configuration")
        return False

    # Check length of strings
    if len(json_obj.get(DEVICE_MANUFACTURER_KEY)) > 28 or len(
        json_obj.get(DEVICE_MODEL_KEY)) > 28:
      LOGGER.error("Device manufacturer or model are longer than 28 characters")
      return False

    disallowed_chars = ["/", "\\", "\'", "\"", ";"]
    for char in json_obj.get(DEVICE_MANUFACTURER_KEY):
      if char in disallowed_chars:
        LOGGER.error("Disallowed character in device manufacturer")
        return False

    for char in json_obj.get(DEVICE_MODEL_KEY):
      if char in disallowed_chars:
        LOGGER.error("Disallowed character in device model")
        return False

    return True

  # Profiles
  def get_profiles_format(self, response: Response):

    # Check if Testrun was able to load the format originally
    if self.get_session().get_profiles_format() is None:
      response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
      return self._generate_msg(
          False, "Testrun could not load the risk assessment format")

    return self.get_session().get_profiles_format()

  def get_profiles(self):
    profiles = []
    for profile in self.get_session().get_profiles():
      profiles.append(json.loads(profile.to_json()))
    return profiles

  async def update_profile(self, request: Request, response: Response):

    LOGGER.debug("Received profile update request")

    # Check if the profiles format was loaded correctly
    if self.get_session().get_profiles_format() is None:
      response.status_code = status.HTTP_501_NOT_IMPLEMENTED
      return self._generate_msg(False,
                                "Risk profiles are not available right now")

    try:
      req_raw = (await request.body()).decode("UTF-8")
      req_json = json.loads(req_raw)
    except JSONDecodeError as e:
      LOGGER.error("An error occurred whilst decoding JSON")
      LOGGER.debug(e)
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid request received")

    # Validate json profile
    if not self.get_session().validate_profile_json(req_json):
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid request received")

    profile_name = req_json.get("name")

    # Check if profile exists
    profile = self.get_session().get_profile(profile_name)

    if profile is None:

      # Create new profile
      profile = self.get_session().update_profile(req_json)

      if profile is not None:
        response.status_code = status.HTTP_201_CREATED
        return self._generate_msg(True, "Successfully created a new profile")
      LOGGER.error("An error occurred whilst creating a new profile")

    else:
      # Update existing profile
      profile = self.get_session().update_profile(req_json)

      if profile is not None:
        response.status_code = status.HTTP_200_OK
        return self._generate_msg(True, "Successfully updated that profile")
      LOGGER.error("An error occurred whilst updating a profile")

    response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    return self._generate_msg(
        False, "An error occurred whilst creating or updating a profile")

  async def delete_profile(self, request: Request, response: Response):

    LOGGER.debug("Received profile delete request")

    try:
      req_raw = (await request.body()).decode("UTF-8")
      req_json = json.loads(req_raw)
    except JSONDecodeError as e:
      LOGGER.error("An error occurred whilst decoding JSON")
      LOGGER.debug(e)
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid request received")

    # Check name included in request
    if "name" not in req_json:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(False, "Invalid request received")

    # Get profile name
    profile_name = req_json.get("name")

    # Fetch profile
    profile = self.get_session().get_profile(profile_name)

    # Check if profile exists
    if profile is None:
      response.status_code = status.HTTP_404_NOT_FOUND
      return self._generate_msg(False,
                                "A profile with that name could not be found")

    # Attempt to delete the profile
    success = self.get_session().delete_profile(profile)

    if not success:
      response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
      return self._generate_msg(
          False, "An error occurred whilst deleting that profile")

    return self._generate_msg(True, "Successfully deleted that profile")

  async def export_profile(self, request: Request, response: Response,
                        profile_name):

    LOGGER.debug(f"Received get profile request for {profile_name}")

    device = None

    try:
      req_raw = (await request.body()).decode("UTF-8")
      req_json = json.loads(req_raw)

      # Check if device mac_addr has been specified
      if "mac_addr" in req_json and len(req_json.get("mac_addr")) > 0:
        device_mac_addr = req_json.get("mac_addr")
        device = self.get_session().get_device(device_mac_addr)

        # If device is not found return 404
        if device is None:
          response.status_code = status.HTTP_404_NOT_FOUND
          return self._generate_msg(
              False, "A device with that mac address could not be found")

    except JSONDecodeError:
      # Device not specified
      pass

    # Retrieve the profile
    profile = self._session.get_profile(profile_name)

    # If the profile not found return 404
    if profile is None:
      LOGGER.info("Profile not found, returning 404")
      response.status_code = 404
      return self._generate_msg(False, "Profile could not be found")

    # If device has been added into the body
    if device:

      try:

        # Path where the PDF will be saved
        profile_pdf_path = os.path.join(PROFILES_PATH, f"{profile_name}.pdf")

        # Write the PDF content
        with open(profile_pdf_path, "wb") as f:
          f.write(profile.to_pdf(device).getvalue())

        # Return the pdf file
        if os.path.isfile(profile_pdf_path):
          return FileResponse(profile_pdf_path)
        else:
          LOGGER.info("Profile could not be found, returning 404")
          response.status_code = 404
          return self._generate_msg(False, "Profile could not be found")

      # Exceptions if the PDF creation fails
      except Exception as e:
        LOGGER.error(f"Error creating the profile PDF: {e}")
        response.status_code = 500
        return self._generate_msg(False, "Error retrieving the profile PDF")

    # If device not added into the body
    else:

      try:

        # Path where the PDF will be saved
        profile_pdf_path = os.path.join(PROFILES_PATH, f"{profile_name}.pdf")

        # Write the PDF content
        with open(profile_pdf_path, "wb") as f:
          f.write(profile.to_pdf_no_device().getvalue())

        # Return the pdf file
        if os.path.isfile(profile_pdf_path):
          return FileResponse(profile_pdf_path)
        else:
          LOGGER.info("Profile could not be found, returning 404")
          response.status_code = 404
          return self._generate_msg(False, "Profile could not be found")

      # Exceptions if the PDF creation fails
      except Exception as e:
        LOGGER.error(f"Error creating the profile PDF: {e}")
        response.status_code = 500
        return self._generate_msg(False, "Error retrieving the profile PDF")

  # Certificates
  def get_certs(self):
    LOGGER.debug("Received certs list request")

    # Reload certs
    self._session.load_certs()

    return self._session.get_certs()

  async def upload_cert(self, file: UploadFile, response: Response):

    filename = file.filename
    content_type = file.content_type

    LOGGER.debug("Received request to upload certificate")
    LOGGER.debug(f"Filename: {filename}, content type: {content_type}")

    if content_type not in [
        "application/x-pem-file", "application/x-x509-ca-cert",
        "application/pkix-cert"
    ]:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(
          False, "Failed to upload certificate. Is it in the correct format?")

    if len(filename) > 24:
      response.status_code = status.HTTP_400_BAD_REQUEST
      return self._generate_msg(
          False, "Invalid filename. Maximum file name length is 24 characters.")

    # Check if file already exists
    if not self._session.check_cert_file_name(filename):
      response.status_code = status.HTTP_409_CONFLICT
      return self._generate_msg(
          False, "A certificate with that file name already exists.")

    # Get file contents
    contents = await file.read()

    try:
      # Pass to session to check and write
      cert_obj = self._session.upload_cert(filename, contents)

    except ValueError as e:

      # Returned when duplicate common name detected
      if str(e) == "A certificate with that name already exists":
        response.status_code = status.HTTP_409_CONFLICT
        return self._generate_msg(
          False, "A certificate with that common name already exists."
        )

      # Returned when organization name is missing
      elif str(e) == "Certificate is missing the organization name":
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(
          False, "The certificate must contain the organization name"
        )

      # Returned when common name is missing
      elif str(e) == "Certificate is missing the common name":
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(
          False, "The certificate must contain the common name"
        )

      # Returned when unable to load PEM file
      else:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(
          False,
          "Failed to upload certificate. Is it in the correct format?")

    # Return error if something went wrong
    if cert_obj is None:
      response.status_code = 500
      return self._generate_msg(
          False, "Failed to upload certificate. Is it in the correct format?")

    response.status_code = status.HTTP_201_CREATED

    return cert_obj

  async def delete_cert(self, request: Request, response: Response):

    LOGGER.debug("Received delete certificate request")

    try:
      req_raw = (await request.body()).decode("UTF-8")
      req_json = json.loads(req_raw)

      if "name" not in req_json:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return self._generate_msg(False, "Received a bad request")

      common_name = req_json.get("name")

      for cert in self._session.get_certs():
        if cert["name"] == common_name:
          self._session.delete_cert(cert["filename"])
          return self._generate_msg(True,
                                    "Successfully deleted the certificate")

      response.status_code = status.HTTP_404_NOT_FOUND
      return self._generate_msg(
          False, "A certificate with that name could not be found")

    except Exception as e:
      LOGGER.error("An error occurred whilst deleting a certificate")
      LOGGER.debug(e)

  def get_test_modules(self):
    modules = []
    for module in self._testrun.get_test_orc().get_test_modules():
      if module.enabled and module.enable_container:
        modules.append(module.display_name)
    return modules

  def get_test_packs(self):
    test_packs: list[str] = []
    for test_pack in self._testrun.get_test_orc().get_test_packs():
      test_packs.append(test_pack.name)
    return test_packs
