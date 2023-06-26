import unittest
from dhcp_config import DHCPConfig
import os

CONFIG_FILE_TEST = '../../../conf/dhcpd.conf'

class DHCPConfigTest(unittest.TestCase):


	def test_resolve_config(self):
		dhcp_config = DHCPConfig()
		path = os.path.abspath(CONFIG_FILE_TEST)
		dhcp_config.resolve_config(CONFIG_FILE_TEST)

		dhcp_config.set_range('10.0.0.20','10.0.0.30')
		#print('Modified Subnet:\n' + str(dhcp_config))

	def test_disable_failover(self):
		dhcp_config = DHCPConfig()
		path = os.path.abspath(CONFIG_FILE_TEST)
		dhcp_config.resolve_config(CONFIG_FILE_TEST)
		dhcp_config.disable_failover()
		print('Disabled Peer:\n' + str(dhcp_config))

		dhcp_config.enable_failover()
		print('Enabled Peer:\n' + str(dhcp_config))


if __name__ == '__main__':
    unittest.main()