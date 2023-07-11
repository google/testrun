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
"""Unit Testing for the DHCP Server config"""
import unittest
from dhcp_config import DHCPConfig
import os

CONFIG_FILE = 'conf/dhcpd.conf'

DHCP_CONFIG = None


def get_config_file_path():
  current_dir = os.path.dirname(os.path.abspath(__file__))
  module_dir = os.path.dirname(
      os.path.dirname(os.path.dirname(os.path.abspath(current_dir))))
  conf_file = os.path.join(module_dir, CONFIG_FILE)
  return conf_file


def get_config():
  dhcp_config = DHCPConfig()
  dhcp_config.resolve_config(get_config_file_path())
  return dhcp_config


class DHCPConfigTest(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    # Resolve the config
    global DHCP_CONFIG
    DHCP_CONFIG = get_config()

  def test_resolve_config(self):
    print('Test Resolve Config:\n' + str(DHCP_CONFIG))

    # Resolve the raw config file
    with open(get_config_file_path(), 'r', encoding='UTF-8') as f:
      lines = f.readlines()

    # Get the resolved config as a
    conf_parts = str(DHCP_CONFIG).split('\n')

    # dhcpd conf is not picky about spacing so we just
    # need to check contents of each line for matching
    # to make sure evertying matches
    for i in range(len(lines)):
      self.assertEqual(lines[i].strip(), conf_parts[i].strip())

  def test_disable_failover(self):
    DHCP_CONFIG.disable_failover()
    print('Test Disable Config:\n' + str(DHCP_CONFIG))
    config_lines = str(DHCP_CONFIG._peer).split('\n')
    for line in config_lines:
      self.assertTrue(line.startswith('#'))

  def test_enable_failover(self):
    DHCP_CONFIG.enable_failover()
    print('Test Enable Config:\n' + str(DHCP_CONFIG))
    config_lines = str(DHCP_CONFIG._peer).split('\n')
    for line in config_lines:
      self.assertFalse(line.startswith('#'))

  def test_add_reserved_host(self):
    DHCP_CONFIG.add_reserved_host('test', '00:11:22:33:44:55', '192.168.10.5')
    host = DHCP_CONFIG.get_reserved_host('00:11:22:33:44:55')
    self.assertIsNotNone(host)
    print('AddHostConfig:\n' + str(DHCP_CONFIG))

  def test_delete_reserved_host(self):
    DHCP_CONFIG.delete_reserved_host('00:11:22:33:44:55')
    host = DHCP_CONFIG.get_reserved_host('00:11:22:33:44:55')
    self.assertIsNone(host)
    print('DeleteHostConfig:\n' + str(DHCP_CONFIG))

  def test_resolve_config_with_hosts(self):
    DHCP_CONFIG.add_reserved_host('test', '00:11:22:33:44:55', '192.168.10.5')
    config_with_hosts = DHCPConfig()
    config_with_hosts.make(str(DHCP_CONFIG))
    host = config_with_hosts.get_reserved_host('00:11:22:33:44:55')
    self.assertIsNotNone(host)
    print('ResolveConfigWithHosts:\n' + str(config_with_hosts))


	def test_set_subnet_range(self):
		DHCP_CONFIG.set_range('10.0.0.0', '10.255.255.255')
		print("SetSubnetRange:\n" + str(DHCP_CONFIG))
		DHCP_CONFIG.set_range('172.16.0.0', '172.31.255.255')
		print("SetSubnetRange:\n" + str(DHCP_CONFIG))
		DHCP_CONFIG.set_range('192.168.0.0', '192.168.255.255')
		print("SetSubnetRange:\n" + str(DHCP_CONFIG))

if __name__ == '__main__':
	suite = unittest.TestSuite()
	suite.addTest(DHCPConfigTest('test_resolve_config'))
	suite.addTest(DHCPConfigTest('test_disable_failover'))
	suite.addTest(DHCPConfigTest('test_enable_failover'))
	suite.addTest(DHCPConfigTest('test_add_reserved_host'))
	suite.addTest(DHCPConfigTest('test_delete_reserved_host'))
	suite.addTest(DHCPConfigTest('test_resolve_config_with_hosts'))
	suite.addTest(DHCPConfigTest('test_set_subnet_range'))
	runner = unittest.TextTestRunner()
	runner.run(suite)
