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
import json
import os
import sys
import signal
import time
from common import logger, util
from common.device import Device
from common.session import TestRunSession

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Locate the test-run root directory, 4 levels, src->python->framework->test-run
root_dir = os.path.dirname(os.path.dirname(
  os.path.dirname(os.path.dirname(current_dir))))

from api.api import Api # pylint: disable=wrong-import-position
from net_orc.listener import NetworkEvent # pylint: disable=wrong-import-position
from test_orc import test_orchestrator as test_orc # pylint: disable=wrong-import-position
from net_orc import network_orchestrator as net_orc # pylint: disable=wrong-import-position

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

class TestRun:  # pylint: disable=too-few-public-methods
  """Test Run controller.

  Creates an instance of the network orchestrator, test
  orchestrator and user interface.
  """

  def __init__(self,
               config_file,
               validate=True,
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

    self._session = TestRunSession(config_file=self._config_file)
    self._load_all_devices()

    self._net_orc = net_orc.NetworkOrchestrator(
      session=self._session,
      validate=validate,
      single_intf = self._single_intf)
    self._test_orc = test_orc.TestOrchestrator(
      self._session,
      self._net_orc)

    if self._no_ui:
      self.start()
    else:
      self._api = Api(self)
      self._api.start()

    # Hold until API ends
    while True:
      time.sleep(1)

  def _load_all_devices(self):
    self._load_devices(device_dir=LOCAL_DEVICES_DIR)
    self._load_devices(device_dir=RESOURCE_DEVICES_DIR)
    return self.get_session().get_device_repository()

  def _load_devices(self, device_dir):
    LOGGER.debug('Loading devices from ' + device_dir)

    os.makedirs(device_dir, exist_ok=True)
    util.run_command(f'chown -R {util.get_host_user()} {device_dir}')

    for device_folder in os.listdir(device_dir):
      with open(os.path.join(device_dir, device_folder, DEVICE_CONFIG),
                encoding='utf-8') as device_config_file:
        device_config_json = json.load(device_config_file)

        device_manufacturer = device_config_json.get(DEVICE_MANUFACTURER)
        device_model = device_config_json.get(DEVICE_MODEL)
        mac_addr = device_config_json.get(DEVICE_MAC_ADDR)
        test_modules = device_config_json.get(DEVICE_TEST_MODULES)

        device = Device(manufacturer=device_manufacturer,
                        model=device_model,
                        mac_addr=mac_addr,
                        test_modules=test_modules)
        self.get_session().add_device(device)
        LOGGER.debug(f'Loaded device {device.manufacturer} {device.model} with MAC address {device.mac_addr}')

  def start(self):

    self._session.start()

    self._start_network()

    if self._net_only:
      LOGGER.info('Network only option configured, no tests will be run')

      self.get_net_orc().listener.register_callback(
        self._device_discovered,
        [NetworkEvent.DEVICE_DISCOVERED]
      )

      self.get_net_orc().start_listener()
      LOGGER.info('Waiting for devices on the network...')

      while True:
        time.sleep(self._session.get_runtime())

    else:
      self._test_orc.start()

      self.get_net_orc().get_listener().register_callback(
          self._device_stable,
          [NetworkEvent.DEVICE_STABLE]
      )

      self.get_net_orc().get_listener().register_callback(
        self._device_discovered,
        [NetworkEvent.DEVICE_DISCOVERED]
      )

      self.get_net_orc().start_listener()
      self._set_status('Waiting for device')
      LOGGER.info('Waiting for devices on the network...')

      time.sleep(self._session.get_runtime())

      if not (self._test_orc.test_in_progress() or
              self.get_net_orc().monitor_in_progress()):
        LOGGER.info('''Timed out whilst waiting for
          device or stopping due to test completion''')
      else:
        while (self._test_orc.test_in_progress() or
          self.get_net_orc().monitor_in_progress()):
          time.sleep(5)

      self.stop()

  def stop(self, kill=False):
    self._set_status('Stopping')

    # Prevent discovering new devices whilst stopping
    if self.get_net_orc().get_listener() is not None:
      self.get_net_orc().get_listener().stop_listener()

    self._stop_tests()
    self._stop_network(kill=kill)

    self.get_session().reset()

  def _register_exits(self):
    signal.signal(signal.SIGINT, self._exit_handler)
    signal.signal(signal.SIGTERM, self._exit_handler)
    signal.signal(signal.SIGABRT, self._exit_handler)
    signal.signal(signal.SIGQUIT, self._exit_handler)

  def _exit_handler(self, signum, arg):  # pylint: disable=unused-argument
    LOGGER.debug('Exit signal received: ' + str(signum))
    if signum in (2, signal.SIGTERM):
      LOGGER.info('Exit signal received.')
      self.stop(kill=True)
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
      self.stop(kill=True)
      sys.exit(1)

  def _stop_network(self, kill=False):
    self.get_net_orc().stop(kill=kill)

  def _stop_tests(self):
    self._test_orc.stop()

  def get_device(self, mac_addr):
    """Returns a loaded device object from the device mac address."""
    for device in self._session.get_device_repository():
      if device.mac_addr == mac_addr:
        return device
    return None

  def _device_discovered(self, mac_addr):

    if self.get_session().get_target_device() is not None:
      if mac_addr != self.get_session().get_target_device().mac_addr:
        # Ignore discovered device
        return

    self._set_status('Identifying device')
    device = self.get_device(mac_addr)
    if device is not None:
      LOGGER.info(
        f'Discovered {device.manufacturer} {device.model} on the network')
    else:
      device = Device(mac_addr=mac_addr)
      self._devices.append(device)
      LOGGER.info(
        f'A new device has been discovered with mac address {mac_addr}')

  def _device_stable(self, mac_addr):
    device = self.get_device(mac_addr)
    LOGGER.info(f'Device with mac address {mac_addr} is ready for testing.')
    self._set_status('In progress')
    self._test_orc.run_test_modules(device)
    self._set_status('Complete')

  def _set_status(self, status):
    self._session.set_status(status)

  def get_session(self):
    return self._session
