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
import os
import sys
import json
import signal
import time
import logger

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(current_dir)

# Add net_orc to Python path
net_orc_dir = os.path.join(parent_dir, 'net_orc', 'python', 'src')
sys.path.append(net_orc_dir)

# Add test_orc to Python path
test_orc_dir = os.path.join(parent_dir, 'test_orc', 'python', 'src')
sys.path.append(test_orc_dir)

from listener import NetworkEvent  # pylint: disable=wrong-import-position,import-outside-toplevel
import test_orchestrator as test_orc  # pylint: disable=wrong-import-position,import-outside-toplevel
import network_orchestrator as net_orc  # pylint: disable=wrong-import-position,import-outside-toplevel

from device import Device # pylint: disable=wrong-import-position,import-outside-toplevel

LOGGER = logger.get_logger('test_run')
CONFIG_FILE = 'conf/system.json'
EXAMPLE_CONFIG_FILE = 'conf/system.json.example'
RUNTIME = 1500

LOCAL_DEVICES_DIR = 'local/devices'
RESOURCE_DEVICES_DIR = 'resources/devices'
DEVICE_CONFIG = 'device_config.json'
DEVICE_MAKE = 'make'
DEVICE_MODEL = 'model'
DEVICE_MAC_ADDR = 'mac_addr'
DEVICE_TEST_MODULES = 'test_modules'


class TestRun:  # pylint: disable=too-few-public-methods
  """Test Run controller.

  Creates an instance of the network orchestrator, test
  orchestrator and user interface.
  """

  def __init__(self,
               config_file=CONFIG_FILE,
               validate=True,
               net_only=False,
               single_intf=False):
    self._devices = []
    self._net_only = net_only
    self._single_intf = single_intf

    # Catch any exit signals
    self._register_exits()

    # Expand the config file to absolute pathing
    config_file_abs = self._get_config_abs(config_file=config_file)

    self._net_orc = net_orc.NetworkOrchestrator(
      config_file=config_file_abs,
      validate=validate,
      async_monitor=not self._net_only,
      single_intf = self._single_intf)

    self._test_orc = test_orc.TestOrchestrator(self._net_orc)

  def start(self):

    self._load_all_devices()

    if self._net_only:
      LOGGER.info('Network only option configured, no tests will be run')
      self._start_network()
    else:
      self._start_network()
      self._test_orc.start()

      self._net_orc.listener.register_callback(
          self._device_stable,
          [NetworkEvent.DEVICE_STABLE]
      )
      self._net_orc.listener.register_callback(
        self._device_discovered,
        [NetworkEvent.DEVICE_DISCOVERED]
      )

      LOGGER.info('Waiting for devices on the network...')

      # Check timeout and whether testing is currently
      # in progress before stopping
      time.sleep(RUNTIME)

    self.stop()

  def stop(self, kill=False):
    self._stop_tests()
    self._stop_network(kill=kill)

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
      config_file = os.path.join(parent_dir, CONFIG_FILE)

    # Expand the config file to absolute pathing
    return os.path.abspath(config_file)

  def _start_network(self):
    # Start the network orchestrator
    self._net_orc.start()

  def _run_tests(self, device):
    """Iterate through and start all test modules."""

    # To Do: Make this configurable
    time.sleep(60)  # Let device bootup

    self._test_orc.run_test_modules(device)

  def _stop_network(self, kill=False):
    self._net_orc.stop(kill=kill)

  def _stop_tests(self):
    self._test_orc.stop()

  def _load_all_devices(self):
    self._load_devices(device_dir=LOCAL_DEVICES_DIR)
    self._load_devices(device_dir=RESOURCE_DEVICES_DIR)

  def _load_devices(self, device_dir):
    LOGGER.debug('Loading devices from ' + device_dir)

    os.makedirs(device_dir, exist_ok=True)

    for device_folder in os.listdir(device_dir):
      with open(os.path.join(device_dir, device_folder, DEVICE_CONFIG),
                encoding='utf-8') as device_config_file:
        device_config_json = json.load(device_config_file)

        device_make = device_config_json.get(DEVICE_MAKE)
        device_model = device_config_json.get(DEVICE_MODEL)
        mac_addr = device_config_json.get(DEVICE_MAC_ADDR)
        test_modules = device_config_json.get(DEVICE_TEST_MODULES)

        device = Device(make=device_make,
                        model=device_model,
                        mac_addr=mac_addr,
                        test_modules=json.dumps(test_modules))
        self._devices.append(device)

  def get_device(self, mac_addr):
    """Returns a loaded device object from the device mac address."""
    for device in self._devices:
      if device.mac_addr == mac_addr:
        return device

  def _device_discovered(self, mac_addr):
    device = self.get_device(mac_addr)
    if device is not None:
      LOGGER.info(
        f'Discovered {device.make} {device.model} on the network')
    else:
      device = Device(mac_addr=mac_addr)
      self._devices.append(device)
      LOGGER.info(
        f'A new device has been discovered with mac address {mac_addr}')

  def _device_stable(self, mac_addr):
    device = self.get_device(mac_addr)
    LOGGER.info(f'Device with mac address {mac_addr} is ready for testing.')
    self._test_orc.run_test_modules(device)
