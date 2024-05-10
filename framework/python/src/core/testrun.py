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

"""The overall control of the Test Run application.

This file provides the integration between all of the
Test Run components, such as net_orc, test_orc and test_ui.

Run using the provided command scripts in the cmd folder.
E.g sudo cmd/start
"""
import docker
import json
import os
import shutil
import signal
import sys
import time
from common import logger, util
from common.device import Device
from common.session import TestRunSession
from common.testreport import TestReport
from api.api import Api
from net_orc.listener import NetworkEvent
from net_orc import network_orchestrator as net_orc
from test_orc import test_orchestrator as test_orc

from docker.errors import ImageNotFound

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Locate the test-run root directory, 4 levels, src->python->framework->test-run
root_dir = os.path.dirname(os.path.dirname(
  os.path.dirname(os.path.dirname(current_dir))))

LOGGER = logger.get_logger('test_run')

DEFAULT_CONFIG_FILE = 'local/system.json'
EXAMPLE_CONFIG_FILE = 'local/system.json.example'

LOCAL_DEVICES_DIR = 'local/devices'
RESOURCE_DEVICES_DIR = 'resources/devices'

DEVICE_CONFIG = 'device_config.json'
DEVICE_MANUFACTURER = 'manufacturer'
DEVICE_MODEL = 'model'
DEVICE_MAC_ADDR = 'mac_addr'
DEVICE_TEST_MODULES = 'test_modules'
MAX_DEVICE_REPORTS_KEY = 'max_device_reports'

class TestRun:  # pylint: disable=too-few-public-methods
  """Test Run controller.

  Creates an instance of the network orchestrator, test
  orchestrator and user interface.
  """

  def __init__(self,
               config_file,
               validate=False,
               net_only=False,
               single_intf=False,
               no_ui=False):

    if config_file is None:
      self._config_file = self._get_config_abs(DEFAULT_CONFIG_FILE)
    else:
      self._config_file = self._get_config_abs(config_file)

    self._net_only = net_only
    self._single_intf = single_intf
    self._no_ui = no_ui

    # Catch any exit signals
    self._register_exits()

    # Create session
    self._session = TestRunSession(config_file=self._config_file)

    # Register runtime parameters
    if single_intf:
      self._session.add_runtime_param('single_intf')
    if net_only:
      self._session.add_runtime_param('net_only')
    if validate:
      self._session.add_runtime_param('validate')

    self.load_all_devices()

    self._net_orc = net_orc.NetworkOrchestrator(
      session=self._session)
    self._test_orc = test_orc.TestOrchestrator(
      self._session,
      self._net_orc)

    if self._no_ui:

      # Check Testrun is able to start
      if self.get_net_orc().check_config() is False:
        return

      # Any additional checks that need to be performed go here

      self.start()

    else:

      # Start UI container
      self.start_ui()

      self._api = Api(self)
      self._api.start()

      # Hold until API ends
      while True:
        time.sleep(1)

  def load_all_devices(self):
    self._session.clear_device_repository()
    self._load_devices(device_dir=LOCAL_DEVICES_DIR)

    # Temporarily removing loading of template device
    # configs (feature not required yet)
    # self._load_devices(device_dir=RESOURCE_DEVICES_DIR)
    return self.get_session().get_device_repository()

  def _load_devices(self, device_dir):
    LOGGER.debug('Loading devices from ' + device_dir)

    util.run_command(f'chown -R {util.get_host_user()} {device_dir}')

    for device_folder in os.listdir(device_dir):

      device_config_file_path = os.path.join(device_dir,
                                             device_folder,
                                             DEVICE_CONFIG)

      # Check if device config file exists before loading
      if not os.path.exists(device_config_file_path):
        LOGGER.error('Device configuration file missing ' +
                     f'from device {device_folder}')
        continue

      # Open device config file
      with open(device_config_file_path,
                encoding='utf-8') as device_config_file:
        device_config_json = json.load(device_config_file)

        device_manufacturer = device_config_json.get(DEVICE_MANUFACTURER)
        device_model = device_config_json.get(DEVICE_MODEL)
        mac_addr = device_config_json.get(DEVICE_MAC_ADDR)
        test_modules = device_config_json.get(DEVICE_TEST_MODULES)
        max_device_reports = None
        if 'max_device_reports' in device_config_json:
          max_device_reports = device_config_json.get(MAX_DEVICE_REPORTS_KEY)

        folder_url = os.path.join(device_dir, device_folder)

        device = Device(folder_url=folder_url,
                        manufacturer=device_manufacturer,
                        model=device_model,
                        mac_addr=mac_addr,
                        test_modules=test_modules,
                        max_device_reports=max_device_reports,
                        device_folder=device_folder)

        self._load_test_reports(device)

        # Add device to device repository
        self.get_session().add_device(device)
        LOGGER.debug(f'Loaded device {device.manufacturer} ' +
                     f'{device.model} with MAC address {device.mac_addr}')

  def _load_test_reports(self, device):

    LOGGER.debug(f'Loading test reports for device {device.model}')

    # Locate reports folder
    reports_folder = os.path.join(root_dir,
                                  LOCAL_DEVICES_DIR,
                                  device.device_folder, 'reports')

    # Check if reports folder exists (device may have no reports)
    if not os.path.exists(reports_folder):
      return

    LOGGER.info(f'Loading reports from {reports_folder}')

    for report_folder in os.listdir(reports_folder):
      report_json_file_path = os.path.join(
        reports_folder,
        report_folder,
        'report.json')

      # Check if the report.json file exists
      if not os.path.isfile(report_json_file_path):
        # Some error may have occured during this test run
        continue

      with open(report_json_file_path, encoding='utf-8') as report_json_file:
        report_json = json.load(report_json_file)
        test_report = TestReport()
        test_report.from_json(report_json)
        device.add_report(test_report)

  def delete_report(self, device: Device, timestamp):
    LOGGER.debug(f'Deleting test report for device {device.model} ' +
                 f'at {timestamp}')

    # Locate reports folder
    reports_folder = os.path.join(root_dir,
                                  LOCAL_DEVICES_DIR,
                                  device.device_folder, 'reports')

    # Check if reports folder exists (device may have no reports)
    if not os.path.exists(reports_folder):
      return False

    for report_folder in os.listdir(reports_folder):
      if report_folder == timestamp:
        shutil.rmtree(os.path.join(reports_folder, report_folder))
        device.remove_report(timestamp)
        LOGGER.debug('Successfully deleted the report')
        return True

    return False

  def create_device(self, device: Device):

    # Define the device folder location
    device_folder_path = os.path.join(root_dir,
                                      LOCAL_DEVICES_DIR,
                                      device.device_folder)

    # Create the directory
    os.makedirs(device_folder_path)

    config_file_path = os.path.join(device_folder_path,
                                    DEVICE_CONFIG)

    with open(config_file_path, 'w', encoding='utf-8') as config_file:
      config_file.writelines(json.dumps(device.to_config_json(), indent=4))

    # Ensure new folder has correct permissions
    util.run_command(f"chown -R {util.get_host_user()} '{device_folder_path}'")

    # Add new device to the device repository
    self._session.add_device(device)

    return device.to_config_json()

  def save_device(self, device: Device, device_json):
    """Edit and save an existing device config."""

    # Update device properties
    device.manufacturer = device_json['manufacturer']
    device.model = device_json['model']

    if 'test_modules' in device_json:
      device.test_modules = device_json['test_modules']
    else:
      device.test_modules = {}

    # Obtain the config file path
    config_file_path = os.path.join(root_dir,
                                      LOCAL_DEVICES_DIR,
                                      device.device_folder,
                                      DEVICE_CONFIG)

    with open(config_file_path, 'w+', encoding='utf-8') as config_file:
      config_file.writelines(json.dumps(device.to_config_json(), indent=4))

    return device.to_config_json()

  def delete_device(self, device: Device):

    # Obtain the config file path
    device_folder = os.path.join(root_dir,
                                  LOCAL_DEVICES_DIR,
                                  device.device_folder)

    # Delete the device directory
    shutil.rmtree(device_folder)

    # Remove the device from the current session device repository
    self.get_session().remove_device(device)

  def start(self):

    self.get_session().start()

    self._start_network()

    self.get_net_orc().get_listener().register_callback(
      self._device_discovered,
      [NetworkEvent.DEVICE_DISCOVERED]
    )

    if self._net_only:
      LOGGER.info('Network only option configured, no tests will be run')
    else:
      self._test_orc.start()

      self.get_net_orc().get_listener().register_callback(
          self._device_stable,
          [NetworkEvent.DEVICE_STABLE]
      )

    self.get_net_orc().start_listener()
    LOGGER.info('Waiting for devices on the network...')

    # Keep application running until stopped
    while True:
      time.sleep(5)

  def stop(self):

    # Prevent discovering new devices whilst stopping
    if self.get_net_orc().get_listener() is not None:
      self.get_net_orc().get_listener().stop_listener()

    self.get_session().stop()

    self._stop_tests()
    self._stop_network(kill=True)
    self.get_session().set_status('Cancelled')

  def _register_exits(self):
    signal.signal(signal.SIGINT, self._exit_handler)
    signal.signal(signal.SIGTERM, self._exit_handler)
    signal.signal(signal.SIGABRT, self._exit_handler)
    signal.signal(signal.SIGQUIT, self._exit_handler)

  def _exit_handler(self, signum, arg):  # pylint: disable=unused-argument
    LOGGER.debug('Exit signal received: ' + str(signum))
    if signum in (2, signal.SIGTERM):
      LOGGER.info('Exit signal received.')
      self.stop()
      self._stop_ui()
      sys.exit(1)

  def _get_config_abs(self, config_file=None):
    if config_file is None:
      # If not defined, use relative pathing to local file
      config_file = os.path.join(root_dir, self._config_file)

    # Expand the config file to absolute pathing
    return os.path.abspath(config_file)

  def get_config_file(self):
    return self._get_config_abs()

  def get_net_orc(self):
    return self._net_orc

  def _start_network(self):
    # Start the network orchestrator
    if not self.get_net_orc().start():
      self.stop()
      sys.exit(1)

  def _stop_network(self, kill=True):
    self.get_net_orc().stop(kill)

  def _stop_tests(self):
    self._test_orc.stop()

  def get_device(self, mac_addr):
    """Returns a loaded device object from the device mac address."""
    for device in self.get_session().get_device_repository():
      if device.mac_addr == mac_addr:
        return device
    return None

  def _device_discovered(self, mac_addr):

    device = self.get_session().get_target_device()

    if device is not None:
      if mac_addr != device.mac_addr:
        # Ignore discovered device because it is not the target device
        return
    else:
      device = self.get_device(mac_addr)
      if device is None:
        return

      self.get_session().set_target_device(device)

    self._set_status('In Progress')

    LOGGER.info(
        f'Discovered {device.manufacturer} {device.model} on the network. ' +
        'Waiting for device to obtain IP')

  def _device_stable(self, mac_addr):

    # Do not continue testing if Testrun has cancelled during monitor phase
    if self.get_session().get_status() == 'Cancelled':
      return

    LOGGER.info(f'Device with mac address {mac_addr} is ready for testing.')
    self._set_status('In Progress')
    result = self._test_orc.run_test_modules()

    if result is not None:
      self._set_status(result)
    self._stop_network()

  def get_session(self):
    return self._session

  def _set_status(self, status):
    self.get_session().set_status(status)

  def start_ui(self):

    self._stop_ui()

    LOGGER.info('Starting UI')

    client = docker.from_env()

    try:
      client.containers.run(
            image='test-run/ui',
            auto_remove=True,
            name='tr-ui',
            hostname='testrun.io',
            detach=True,
            ports={
              '80': 8080
            }
      )
    except ImageNotFound as ie:
      LOGGER.error('An error occured whilst starting the UI. ' +
                   'Please investigate and try again.')
      LOGGER.error(ie)
      sys.exit(1)

    # TODO: Make port configurable
    LOGGER.info('User interface is ready on http://localhost:8080')

  def _stop_ui(self):
    LOGGER.info('Stopping user interface')
    client = docker.from_env()
    try:
      container = client.containers.get('tr-ui')
      if container is not None:
        container.kill()
    except docker.errors.NotFound:
      return
