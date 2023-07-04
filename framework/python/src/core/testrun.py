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
import signal
import time
from common import logger
from common.device import Device

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Locate the test-run root directory, 4 levels, src->python->framework->test-run
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))

from api.api import Api
from net_orc.listener import NetworkEvent
from test_orc import test_orchestrator as test_orc
from net_orc import network_orchestrator as net_orc

LOGGER = logger.get_logger('test_run')
DEFAULT_CONFIG_FILE = 'local/system.json'
EXAMPLE_CONFIG_FILE = 'local/system.json.example'
RUNTIME = 120

class TestRun:  # pylint: disable=too-few-public-methods
  """Test Run controller.

  Creates an instance of the network orchestrator, test
  orchestrator and user interface.
  """

  def __init__(self,
               config_file=DEFAULT_CONFIG_FILE,
               validate=True,
               net_only=False,
               single_intf=False):

    self._devices = []
    self._net_only = net_only
    self._single_intf = single_intf
    self._config_file = config_file

    # Catch any exit signals
    self._register_exits()

    # Expand the config file to absolute pathing
    config_file_abs = self._get_config_abs(config_file=self._config_file)

    self._net_orc = net_orc.NetworkOrchestrator(
      config_file=config_file_abs,
      validate=validate,
      single_intf = self._single_intf)

    self._test_orc = test_orc.TestOrchestrator(self._net_orc)

    self._api = Api(self)
    self._devices = self._api.load_all_devices()
    self._api.start()

  def start(self):

    self._start_network()

    if self._net_only:
      LOGGER.info('Network only option configured, no tests will be run')

      self._net_orc.listener.register_callback(
        self._device_discovered,
        [NetworkEvent.DEVICE_DISCOVERED]
      )

      self._net_orc.start_listener()
      LOGGER.info('Waiting for devices on the network...')

      while True:
        time.sleep(RUNTIME)

    else:
      self._test_orc.start()

      self._net_orc.listener.register_callback(
          self._device_stable,
          [NetworkEvent.DEVICE_STABLE]
      )

      self._net_orc.listener.register_callback(
        self._device_discovered,
        [NetworkEvent.DEVICE_DISCOVERED]
      )

      self._net_orc.start_listener()
      LOGGER.info('Waiting for devices on the network...')

      time.sleep(RUNTIME)

      if not (self._test_orc.test_in_progress() or self._net_orc.monitor_in_progress()):
        LOGGER.info('Timed out whilst waiting for device or stopping due to test completion')
      else:
        while self._test_orc.test_in_progress() or self._net_orc.monitor_in_progress():
          time.sleep(5)

      self.stop()

  def stop(self, kill=False):
    self._stop_tests()
    self._stop_network(kill=kill)
    self._api.stop()

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

  def _start_network(self):
    # Start the network orchestrator
    if not self._net_orc.start():
      self.stop(kill=True)
      sys.exit(1)

  def _stop_network(self, kill=False):
    self._net_orc.stop(kill=kill)

  def _stop_tests(self):
    self._test_orc.stop()

  def get_device(self, mac_addr):
    """Returns a loaded device object from the device mac address."""
    for device in self._devices:
      if device.mac_addr == mac_addr:
        return device

  def _device_discovered(self, mac_addr):
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
    self._test_orc.run_test_modules(device)
