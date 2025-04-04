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
"""Protocol test module"""
from test_module import TestModule
import netifaces
from protocol_bacnet import BACnet
from protocol_modbus import Modbus

LOG_NAME = 'test_protocol'
LOGGER = None


class ProtocolModule(TestModule):
  """Protocol test module"""

  def __init__(self, module):
    self._supports_bacnet = False
    super().__init__(module_name=module, log_name=LOG_NAME)
    global LOGGER
    LOGGER = self._get_logger()
    self._bacnet = BACnet(log=LOGGER, device_hw_addr=self._device_mac)

  def _protocol_valid_bacnet(self):
    LOGGER.info('Running protocol.valid_bacnet')
    result = None
    interface_name = 'veth0'
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4()

    if self._device_ipv4_addr is None:
      LOGGER.error('No device IP could be resolved')
      return 'Error', 'Could not resolve device IP address'

    # Resolve the appropriate IP for BACnet comms
    local_address = self.get_local_ip(interface_name)
    if local_address:
      self._bacnet.discover(local_address + '/24')
      result = self._bacnet.validate_device()
      if result[0]:
        self._supports_bacnet = True
    else:
      result = 'Error', 'Failed to perform BACnet discovery'
    return result

  def _protocol_bacnet_version(self):
    """
    Validates the BACnet version of the discovered device.
    The `protocol_valid_bacnet` test must be enabled and successful before
    this test can pass.
    """
    LOGGER.info('Running protocol.bacnet.version')
    result_status = 'Feature Not Detected'
    result_description = 'Device did not respond to BACnet discovery'

    # Do not run test if device does not support BACnet
    if not self._supports_bacnet:
      return result_status, result_description

    if len(self._bacnet.devices) > 0:
      for device in self._bacnet.devices:
        LOGGER.debug(f'Checking BACnet version for device: {device}')
        device_addr = device[2]
        device_id = device[3]
        result_status, result_description = \
          self._bacnet.validate_protocol_version(device_addr,device_id)
        break

    LOGGER.info(result_description)
    return result_status, result_description

  def _protocol_valid_modbus(self, config):
    LOGGER.info('Running protocol.valid_modbus')
    # Extract basic device connection information
    modbus = Modbus(log=LOGGER, device_ip=self._device_ipv4_addr, config=config)
    results = modbus.validate_device()
    result_status = None
    result_description = ''
    result_details = results[1]

    # Determine results and return proper messaging and details
    if results[0] is None:
      result_status = 'Feature Not Detected'
      result_description = 'Device did not respond to Modbus connection'
    elif results[0]:
      result_status = True
      result_description = 'Valid modbus communication detected'
    else:
      result_status = False
      result_description = 'Failed to confirm valid modbus communication'
    return result_status, result_description, result_details

  def get_local_ip(self, interface_name):
    try:
      addresses = netifaces.ifaddresses(interface_name)
      local_address = addresses[netifaces.AF_INET][0]['addr']
      if local_address:
        LOGGER.info(f'IP address of {interface_name}: {local_address}')
      else:
        LOGGER.info(f'Unable to retrieve IP address for {interface_name}')
      return local_address
    except (KeyError, IndexError):
      return None
