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
import os
import unittest
from common import logger

MODULE = 'conn'
# Define the file paths
TEST_FILES_DIR = 'testing/unit/' + MODULE
ETHTOOL_RESULTS_COMPLIANT_FILE = os.path.join(TEST_FILES_DIR, 'ethtool',
                                    'ethtool_results_compliant.txt')
ETHTOOL_RESULTS_NONCOMPLIANT_FILE = os.path.join(TEST_FILES_DIR, 'ethtool',
                                    'ethtool_results_noncompliant.txt')
ETHTOOL_RESULTS_NO_AUTO_FILE = os.path.join(TEST_FILES_DIR, 'ethtool',
                                    'ethtool_results_no_autononegotiation.txt')
LOGGER = None


class ConnectionModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning Connection module behaviors"""

  @classmethod
  def setUpClass(cls):
    global LOGGER
    LOGGER = logger.get_logger('unit_test_' + MODULE)

  # Test the port link status
  def connection_port_link_compliant_test(self):
    LOGGER.info('connection_port_link_compliant_test')
    p_stats = PortStatsUtil(logger=LOGGER,
                               ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE)
    result = p_stats.connection_port_link_test()
    LOGGER.info(result)

  # Test the port duplex setting
  def connection_port_duplex_compliant_test(self):
    LOGGER.info('connection_port_duplex_compliant_test')
    p_stats = PortStatsUtil(logger=LOGGER,
                               ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE)
    result = p_stats.connection_port_duplex_test()
    LOGGER.info(result)
    self.assertEqual(result[0], True)

  # Test the port speed
  def connection_port_speed_compliant_test(self):
    LOGGER.info('connection_port_speed_compliant_test')
    p_stats = PortStatsUtil(logger=LOGGER,
                               ethtool_conn_stats_file=ETHTOOL_RESULTS_COMPLIANT_FILE)
    result = p_stats.connection_port_speed_test()
    LOGGER.info(result)
    self.assertEqual(result[0], True)

  # Test the port link status non-compliant
  def connection_port_link_noncompliant_test(self):
    LOGGER.info('connection_port_link_noncompliant_test')
    p_stats = PortStatsUtil(logger=LOGGER,
                               ethtool_conn_stats_file=ETHTOOL_RESULTS_NONCOMPLIANT_FILE)
    result = p_stats.connection_port_link_test()
    LOGGER.info(result)

  # Test the port duplex setting non-compliant
  def connection_port_duplex_noncompliant_test(self):
    LOGGER.info('connection_port_duplex_noncompliant_test')
    p_stats = PortStatsUtil(logger=LOGGER,
                               ethtool_conn_stats_file=ETHTOOL_RESULTS_NONCOMPLIANT_FILE)
    result = p_stats.connection_port_duplex_test()
    LOGGER.info(result)
    self.assertEqual(result[0], False)

  # Test the port speed non-compliant
  def connection_port_speed_noncompliant_test(self):
    LOGGER.info('connection_port_speed_noncompliant_test')
    p_stats = PortStatsUtil(logger=LOGGER,
                               ethtool_conn_stats_file=ETHTOOL_RESULTS_NONCOMPLIANT_FILE)
    result = p_stats.connection_port_speed_test()
    LOGGER.info(result)
    self.assertEqual(result[0], False)

  # Test the autonegotiation failure test
  def connection_port_speed_autonegotiation_fail_test(self):
    LOGGER.info('connection_port_speed_autonegotiation_fail_test')
    p_stats = PortStatsUtil(logger=LOGGER,
                               ethtool_conn_stats_file=ETHTOOL_RESULTS_NO_AUTO_FILE)
    result = p_stats.connection_port_speed_test()
    LOGGER.info(result)
    self.assertEqual(result[0], False)

if __name__ == '__main__':
  suite = unittest.TestSuite()

  # Compliant port stats tests
  suite.addTest(ConnectionModuleTest('connection_port_link_compliant_test'))
  suite.addTest(ConnectionModuleTest('connection_port_duplex_compliant_test'))
  suite.addTest(ConnectionModuleTest('connection_port_speed_compliant_test'))

  # Non-compliant port stats tests
  suite.addTest(ConnectionModuleTest('connection_port_link_noncompliant_test'))
  suite.addTest(ConnectionModuleTest('connection_port_duplex_noncompliant_test'))
  suite.addTest(ConnectionModuleTest('connection_port_speed_noncompliant_test'))

  # Autonegotiation off failure test
  suite.addTest(ConnectionModuleTest('connection_port_speed_autonegotiation_fail_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
