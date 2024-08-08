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
"""Module run all the DNS related unit tests"""
from protocol_bacnet import BACnet
import unittest
import os
from common import logger
import inspect

MODULE = 'protocol'

# Define the directories
TEST_FILES_DIR = 'testing/unit/' + MODULE
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')
REPORTS_DIR = os.path.join(TEST_FILES_DIR, 'reports/')
CAPTURES_DIR = os.path.join(TEST_FILES_DIR, 'captures/')

# Define the capture files to be used for the test
PROTOCOL_CAPTURE_FILE = os.path.join(CAPTURES_DIR, 'bacnet.pcap')

HW_ADDR = 'AA:BB:CC:DD:EE:FF'
HW_ADDR_BAD = 'AA:BB:CC:DD:EE:FE'
BACNET = None
LOGGER = None


class ProtocolModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    global LOGGER
    LOGGER = logger.get_logger('unit_test_' + MODULE)
    global BACNET
    BACNET = BACnet(log=LOGGER,
                    captures_dir=CAPTURES_DIR,
                    capture_file='bacnet.pcap',
                    device_hw_addr=HW_ADDR)

  # Test the BACNet traffic for a matching Object ID and HW address
  def bacnet_protocol_traffic_test(self):
    LOGGER.info(f'Running { inspect.currentframe().f_code.co_name}')
    result = BACNET.validate_bacnet_source(object_id='1761001',
                                           device_hw_addr=HW_ADDR)
    LOGGER.info(f'Test Result: {result}')
    self.assertEqual(result, True)

  # Test the BACNet test when Object ID and HW address
  # do not match
  def bacnet_protocol_traffic_fail_test(self):
    LOGGER.info(f'Running { inspect.currentframe().f_code.co_name}')
    result = BACNET.validate_bacnet_source(object_id='1761001',
                                           device_hw_addr=HW_ADDR_BAD)
    LOGGER.info(f'Test Result: {result}')
    self.assertEqual(result, False)

  # Test a BACnet device with valid traffic to/from an
  # expected HW address and Object ID
  def bacnet_protocol_validate_device_test(self):
    LOGGER.info(f'Running { inspect.currentframe().f_code.co_name}')
    # Load bacnet devices to simulate a discovery
    bac_dev = ('TestDevice', 'Testrun', '10.10.10.14', 1761001)
    BACNET.devices = [bac_dev]
    result = BACNET.validate_device()
    LOGGER.info(f'Test Result: {result}')
    self.assertEqual(result, (True, 'BACnet device discovered'))

  # Test a BACnet device with valid traffic to/from an
  # expected HW address and Object ID
  def bacnet_protocol_validate_device_fail_test(self):
    LOGGER.info(f'Running { inspect.currentframe().f_code.co_name}')
    # Load bacnet devices to simulate a discovery
    bac_dev = ('TestDevice', 'Testrun', '10.10.10.14', 1761001)
    BACNET.devices = [bac_dev]
    # Change the MAC address to a different device than expected
    BACNET.device_hw_addr = HW_ADDR_BAD
    result = BACNET.validate_device()
    LOGGER.info(f'Test Result: {result}')
    self.assertEqual(
        result,
        (False, 'BACnet device was found but was not device under test'))


if __name__ == '__main__':
  suite = unittest.TestSuite()

  suite.addTest(ProtocolModuleTest('bacnet_protocol_traffic_test'))
  suite.addTest(ProtocolModuleTest('bacnet_protocol_traffic_fail_test'))

  suite.addTest(ProtocolModuleTest('bacnet_protocol_validate_device_test'))
  suite.addTest(ProtocolModuleTest('bacnet_protocol_validate_device_fail_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
