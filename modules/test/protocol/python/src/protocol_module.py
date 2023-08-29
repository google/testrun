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

LOG_NAME = 'test_protocol'
LOGGER = None


class ProtocolModule(TestModule):
  """Protocol Test module"""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    global LOGGER
    LOGGER = self._get_logger()
    self._bacnet = BACnet(LOGGER)

  def _protocol_valid_bacnet(self):
    LOGGER.info('Running protocol.valid_bacnet')
    result = None
    interface_name = 'veth0'

    # Resolve the appropriate IP for BACnet comms
    local_address = self.get_local_ip(interface_name)
    if local_address:
      result = self._bacnet.validate_device(local_address, self._device_ipv4_addr)
    else:
      result = None, 'Could not resolve test container IP for BACnet discovery'
    return result
    
  def _protocol_valid_modbus(self):
    LOGGER.info('Running protocol.valid_modbus')
    return None, 'Test not yet implemented'

  def get_local_ip(self, interface_name):
    try:
      addresses = netifaces.ifaddresses(interface_name)
      local_address = addresses[netifaces.AF_INET][0]['addr']
      if local_address:
        LOGGER.info(f"IP address of {interface_name}: {local_address}")
      else:
        LOGGER.info(f"Unable to retrieve IP address for {interface_name}")
      return local_address
    except (KeyError, IndexError):
      return None
