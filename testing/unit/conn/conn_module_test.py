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
"""Module run all the Connection module related unit tests"""
from port_stats_util import PortStatsUtil
from connection_module import ConnectionModule
import os
import sys
import unittest
from common import logger

MODULE = 'conn'
# Define the directories
TEST_FILES_DIR = '/testing/unit/' + MODULE
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')
CAPTURES_DIR = os.path.join(TEST_FILES_DIR, 'captures/')

ETHTOOL_RESULTS_COMPLIANT_FILE = os.path.join(TEST_FILES_DIR, 'ethtool',
                                              'ethtool_results_compliant.txt')
ETHTOOL_RESULTS_NONCOMPLIANT_FILE = os.path.join(
    TEST_FILES_DIR, 'ethtool', 'ethtool_results_noncompliant.txt')
ETHTOOL_RESULTS_NO_AUTO_FILE = os.path.join(
    TEST_FILES_DIR, 'ethtool', 'ethtool_results_no_autononegotiation.txt')

ETHTOOL_PORT_STATS_PRE_FILE = os.path.join(
    TEST_FILES_DIR, 'ethtool', 'ethtool_port_stats_pre_monitor.txt')
ETHTOOL_PORT_STATS_POST_FILE = os.path.join(
    TEST_FILES_DIR, 'ethtool', 'ethtool_port_stats_post_monitor.txt')
ETHTOOL_PORT_STATS_POST_NONCOMPLIANT_FILE = os.path.join(
    TEST_FILES_DIR, 'ethtool',
    'ethtool_port_stats_post_monitor_noncompliant.txt')

IFCONFIG_PORT_STATS_PRE_FILE = os.path.join(
    TEST_FILES_DIR, 'ifconfig', 'ifconfig_port_stats_pre_monitor.txt')
IFCONFIG_PORT_STATS_POST_FILE = os.path.join(
    TEST_FILES_DIR, 'ifconfig', 'ifconfig_port_stats_post_monitor.txt')
IFCONFIG_PORT_STATS_POST_NONCOMPLIANT_FILE = os.path.join(
    TEST_FILES_DIR, 'ifconfig',
    'ifconfig_port_stats_post_noncompliant_monitor.txt')

# Define the capture files to be used for the test
STARTUP_CAPTURE_FILE = os.path.join(CAPTURES_DIR, 'startup.pcap')
MONITOR_CAPTURE_FILE = os.path.join(CAPTURES_DIR, 'monitor.pcap')

LOGGER = None


class ConnectionModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning Connection 
  module behaviors"""

  @classmethod
  def setUpClass(cls):
    global LOGGER
    LOGGER = logger.get_logger('unit_test_' + MODULE)

    # Set the MAC address for device in capture files
    os.environ['DEVICE_MAC'] = '98:f0:7b:d1:87:06'

  # Test the port link status
  def connection_port_link_compliant_test(self):
    LOGGER.info('connection_port_link_compliant_test')
    p_stats = PortStatsUtil(
        logger=LOGGER,
        ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE,
        ethtool_port_stats_pre_file=ETHTOOL_PORT_STATS_PRE_FILE,
        ethtool_port_stats_post_file=ETHTOOL_PORT_STATS_POST_FILE)
    result = p_stats.connection_port_link_test()
    LOGGER.info(result)
    self.assertEqual(result[0], True)

  def connection_port_link_ifconfig_compliant_test(self):
    LOGGER.info('connection_port_link_ifconfig_compliant_test')
    p_stats = PortStatsUtil(
        logger=LOGGER,
        ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE,
        ifconfig_port_stats_pre_file=IFCONFIG_PORT_STATS_PRE_FILE,
        ifconfig_port_stats_post_file=IFCONFIG_PORT_STATS_POST_FILE)
    result = p_stats.connection_port_link_test()
    LOGGER.info(result)
    self.assertEqual(result[0], True)

  def connection_port_link_ifconfig_noncompliant_test(self):
    LOGGER.info('connection_port_link_ifconfig_noncompliant_test')
    p_stats = PortStatsUtil(
        logger=LOGGER,
        ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE,
        ifconfig_port_stats_pre_file=IFCONFIG_PORT_STATS_PRE_FILE,
        ifconfig_port_stats_post_file=IFCONFIG_PORT_STATS_POST_NONCOMPLIANT_FILE
    )
    result = p_stats.connection_port_link_test()
    LOGGER.info(result)
    self.assertEqual(result[0], False)

  # Test the port duplex setting
  def connection_port_duplex_compliant_test(self):
    LOGGER.info('connection_port_duplex_compliant_test')
    p_stats = PortStatsUtil(
        logger=LOGGER, ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE)
    result = p_stats.connection_port_duplex_test()
    LOGGER.info(result)
    self.assertEqual(result[0], True)

  # Test the port speed
  def connection_port_speed_compliant_test(self):
    LOGGER.info('connection_port_speed_compliant_test')
    p_stats = PortStatsUtil(
        logger=LOGGER, ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE)
    result = p_stats.connection_port_speed_test()
    LOGGER.info(result)
    self.assertEqual(result[0], True)

  # Test the port link status non-compliant
  def connection_port_link_noncompliant_test(self):
    LOGGER.info('connection_port_link_noncompliant_test')
    p_stats = PortStatsUtil(
        logger=LOGGER,
        ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE,
        ethtool_port_stats_pre_file=ETHTOOL_PORT_STATS_PRE_FILE,
        ethtool_port_stats_post_file=ETHTOOL_PORT_STATS_POST_NONCOMPLIANT_FILE)
    result = p_stats.connection_port_link_test()
    LOGGER.info(result)
    self.assertEqual(result[0], False)

  # Test the port duplex setting non-compliant
  def connection_port_duplex_noncompliant_test(self):
    LOGGER.info('connection_port_duplex_noncompliant_test')
    p_stats = PortStatsUtil(
        logger=LOGGER,
        ethtool_conn_stats_file=ETHTOOL_RESULTS_NONCOMPLIANT_FILE)
    result = p_stats.connection_port_duplex_test()
    LOGGER.info(result)
    self.assertEqual(result[0], False)

  # Test the port speed non-compliant
  def connection_port_speed_noncompliant_test(self):
    LOGGER.info('connection_port_speed_noncompliant_test')
    p_stats = PortStatsUtil(
        logger=LOGGER,
        ethtool_conn_stats_file=ETHTOOL_RESULTS_NONCOMPLIANT_FILE)
    result = p_stats.connection_port_speed_test()
    LOGGER.info(result)
    self.assertEqual(result[0], False)

  # Test the autonegotiation failure test
  def connection_port_speed_autonegotiation_fail_test(self):
    LOGGER.info('connection_port_speed_autonegotiation_fail_test')
    p_stats = PortStatsUtil(
        logger=LOGGER, ethtool_conn_stats_file=ETHTOOL_RESULTS_NO_AUTO_FILE)
    result = p_stats.connection_port_speed_test()
    LOGGER.info(result)
    self.assertEqual(result[0], False)

  # Test proper filtering for ICMP protocol in DHCP packets
  def connection_switch_dhcp_snooping_icmp_test(self):
    LOGGER.info('connection_switch_dhcp_snooping_icmp_test')
    conn_module = ConnectionModule(module=MODULE,
                                   results_dir=OUTPUT_DIR,
                                   startup_capture_file=STARTUP_CAPTURE_FILE,
                                   monitor_capture_file=MONITOR_CAPTURE_FILE)
    result = conn_module._connection_switch_dhcp_snooping()  # pylint: disable=W0212
    LOGGER.info(result)
    self.assertEqual(result[0], True)

  def communication_network_type_test(self):
    LOGGER.info('communication_network_type_test')
    conn_module = ConnectionModule(module=MODULE,
                                   results_dir=OUTPUT_DIR,
                                   startup_capture_file=STARTUP_CAPTURE_FILE,
                                   monitor_capture_file=MONITOR_CAPTURE_FILE)
    result = conn_module._communication_network_type()  # pylint: disable=W0212
    details_expected = {
        'mac_address': '98:f0:7b:d1:87:06',
        'multicast': {
            'from': 11,
            'to': 0
        },
        'broadcast': {
            'from': 13,
            'to': 0
        },
        'unicast': {
            'from': 0,
            'to': 0
        }
    }
    LOGGER.info(result)
    self.assertEqual(result[0], 'Informational')
    self.assertEqual(result[1], 'Packet types detected: Multicast, Broadcast')
    self.assertEqual(result[2], details_expected)
    #self.assertEqual(result[0], True)


if __name__ == '__main__':
  suite = unittest.TestSuite()

  # Compliant port stats tests
  suite.addTest(ConnectionModuleTest('connection_port_link_compliant_test'))
  suite.addTest(
      ConnectionModuleTest('connection_port_link_ifconfig_compliant_test'))
  suite.addTest(ConnectionModuleTest('connection_port_duplex_compliant_test'))
  suite.addTest(ConnectionModuleTest('connection_port_speed_compliant_test'))

  # Non-compliant port stats tests
  suite.addTest(ConnectionModuleTest('connection_port_link_noncompliant_test'))
  suite.addTest(
      ConnectionModuleTest('connection_port_link_ifconfig_noncompliant_test'))
  suite.addTest(
      ConnectionModuleTest('connection_port_duplex_noncompliant_test'))
  suite.addTest(ConnectionModuleTest('connection_port_speed_noncompliant_test'))

  # Autonegotiation off failure test
  suite.addTest(
      ConnectionModuleTest('connection_port_speed_autonegotiation_fail_test'))

  # DHCP Snooping related tests
  suite.addTest(
      ConnectionModuleTest('connection_switch_dhcp_snooping_icmp_test'))

  # DHCP Snooping related tests
  suite.addTest(ConnectionModuleTest('communication_network_type_test'))

  runner = unittest.TextTestRunner()
  test_result = runner.run(suite)

  # Check if the tests failed and exit with the appropriate code
  if not test_result.wasSuccessful():
    sys.exit(1)  # Return a non-zero exit code for failures
  sys.exit(0)  # Return zero for success
