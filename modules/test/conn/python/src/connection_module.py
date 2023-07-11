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
"""Connection test module"""
import util
import sys
import json
import time
from datetime import datetime
from scapy.all import rdpcap, DHCP, Ether
from test_module import TestModule
from dhcp1.client import Client as DHCPClient1
from dhcp2.client import Client as DHCPClient2

LOG_NAME = 'test_connection'
LOGGER = None
OUI_FILE = '/usr/local/etc/oui.txt'
DHCP_SERVER_CAPTURE_FILE = '/runtime/network/dhcp-1.pcap'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'


class ConnectionModule(TestModule):
  """Connection Test module"""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    global LOGGER
    LOGGER = self._get_logger()
    self.dhcp1_client = DHCPClient1()
    self.dhcp2_client = DHCPClient2()
    
    # ToDo: Move this into some level of testing, leave for 
    # reference until tests are implemented with these calls
    # response = self.dhcp1_client.add_reserved_lease(
    # 'test','00:11:22:33:44:55','10.10.10.21')
    # print("AddLeaseResp: " + str(response))

    # response = self.dhcp1_client.delete_reserved_lease('00:11:22:33:44:55')
    # print("DelLeaseResp: " + str(response))

    # response = self.dhcp1_client.disable_failover()
    # print("FailoverDisabled: " + str(response))

    # response = self.dhcp1_client.enable_failover()
    # print("FailoverEnabled: " + str(response))

    # response = self.dhcp1_client.get_dhcp_range()
    # print("DHCP Range: " + str(response))

    # response = self.dhcp1_client.get_lease(self._device_mac)
    # print("Lease: " + str(response))

    # response = self.dhcp1_client.get_status()
    # print("Status: " + str(response))

    # response = self.dhcp1_client.set_dhcp_range('10.10.10.20','10.10.10.30')
    # print("Set Range: " + str(response))

  def _connection_private_address(self,config):
    # Shutdown the secondary DHCP Server
    LOGGER.info("Running connection.private_address")
    LOGGER.info("Stopping secondary DHCP server")
    response = self.dhcp2_client.stop_dhcp_server()
    if response.code == 200:
      LOGGER.info("Secondary DHCP server stop command success")
      time.sleep(3) # Give some time for the server to stop
      LOGGER.info("Checking secondary DHCP server status")
      response = self.dhcp2_client.get_status()
      if response.code == 200:
        LOGGER.info("Secondary DHCP server stopped")

    # Move primary DHCP server from failover into a single DHCP server config
    LOGGER.info("Configuring primary DHCP server")
    response = self.dhcp1_client.disable_failover()
    if response.code == 200:
      LOGGER.info("Checking current device lease")
      response = self.dhcp1_client.get_lease(self._device_mac)
      if response.code == 200:
        lease = eval(response.message)
        LOGGER.info("Current lease found")
        if 'ip' in lease:
          ip_addr = lease['ip']
          LOGGER.info("IP Resolved: " + ip_addr)
          LOGGER.info("Attempting to ping device...");
          ping_success = self._ping(self._device_ipv4_addr)
          LOGGER.info("Ping Success: " + str(ping_success))
          LOGGER.info("Current lease confirmed active in device")

    LOGGER.info("Private subnets configured for testing: " + str(config))

    for subnet in config:
      lease = self._get_cur_lease()
      if lease is not None:
        self._test_subnet(subnet,lease)

    return False, 'Test not yet implemented'

  def _test_subnet(self,subnet,lease):
    if self._change_subnet(subnet):
      expiration = datetime.strptime(lease['expires'], '%Y-%m-%d %H:%M:%S')
      time_to_expire = expiration - datetime.now()
      LOGGER.info("Time until lease expiration: " + str(time_to_expire))
      LOGGER.info("Waiting for current lease to expire: " + str(expiration))
      if time_to_expire.total_seconds() > 0:
        time.sleep(time_to_expire.total_seconds() + 5) # Wait until the expiration time and padd 5 seconds
        LOGGER.info("Current lease expired. Checking for new lease")
        for _ in range(5):
          LOGGER.info("Checking for new lease")
          lease = self._get_cur_lease()
          if lease is not None:
            LOGGER.info("New Lease found: " + str(lease))
            LOGGER.info("Validating subnet for new lease...")
            break
          else:
            LOGGER.info("New lease not found. Waiting to check again")
          time.sleep(5)

  def _change_subnet(self,subnet):
    LOGGER.info("Changing subnet to: " + str(subnet))
    response = self.dhcp1_client.set_dhcp_range(subnet['start'],subnet['end'])
    if response.code == 200:
      LOGGER.info("Subnet change request accepted. Confirming change...")
      response = self.dhcp1_client.get_dhcp_range()
      if response.code == 200:
        if response.start == subnet['start'] and response.end == subnet['end']:
          LOGGER.info("Subnet change confirmed")
          return True
      LOGGER.error("Failed to confirm subnet change")
    else:
      LOGGER.error("Subnet change request failed.")
    return False

  def _get_cur_lease(self):
    LOGGER.info("Checking current device lease")
    response = self.dhcp1_client.get_lease(self._device_mac)
    if response.code == 200:
      lease = eval(response.message)
      if lease: # Check if non-empty lease
        LOGGER.info("Current lease found")
        return lease
    else:
      return None

  def _connection_dhcp_address(self):
    LOGGER.info('Running connection.dhcp_address')
    response = self.dhcp1_client.get_lease(self._device_mac)
    LOGGER.info('DHCP Lease resolved:\n' + str(response))
    if response.code == 200:
      lease = eval(response.message) # pylint: disable=E0203
      if 'ip' in lease:
        ip_addr = lease['ip']
        LOGGER.info('IP Resolved: ' + ip_addr)
        LOGGER.info('Attempting to ping device...')
        ping_success = self._ping(self._device_ipv4_addr)
        LOGGER.info('Ping Success: ' + str(ping_success))
        if ping_success:
          return True, 'Device responded to leased ip address'
        else:
          return False, 'Device did not respond to leased ip address'
    else:
      LOGGER.info('No DHCP lease found for: ' + self._device_mac)
      return False, 'No DHCP lease found for: ' + self._device_mac

  def _connection_mac_address(self):
    LOGGER.info('Running connection.mac_address')
    if self._device_mac is not None:
      LOGGER.info('MAC address found: ' + self._device_mac)
      return True, 'MAC address found: ' + self._device_mac
    else:
      LOGGER.info('No MAC address found: ' + self._device_mac)
      return False, 'No MAC address found.'

  def _connection_mac_oui(self):
    LOGGER.info('Running connection.mac_oui')
    manufacturer = self._get_oui_manufacturer(self._device_mac)
    if manufacturer is not None:
      LOGGER.info('OUI Manufacturer found: ' + manufacturer)
      return True, 'OUI Manufacturer found: ' + manufacturer
    else:
      LOGGER.info('No OUI Manufacturer found for: ' + self._device_mac)
      return False, 'No OUI Manufacturer found for: ' + self._device_mac

  def _connection_single_ip(self):
    LOGGER.info('Running connection.single_ip')

    result = None
    if self._device_mac is None:
      LOGGER.info('No MAC address found: ')
      return result, 'No MAC address found.'

    # Read all the pcap files containing DHCP packet information
    packets = rdpcap(DHCP_SERVER_CAPTURE_FILE)
    packets.append(rdpcap(STARTUP_CAPTURE_FILE))
    packets.append(rdpcap(MONITOR_CAPTURE_FILE))

    # Extract MAC addresses from DHCP packets
    mac_addresses = set()
    LOGGER.info('Inspecting: ' + str(len(packets)) + ' packets')
    for packet in packets:
      # Option[1] = message-type, option 3 = DHCPREQUEST
      if DHCP in packet and packet[DHCP].options[0][1] == 3:
        mac_address = packet[Ether].src
        mac_addresses.add(mac_address.upper())

    # Check if the device mac address is in the list of DHCPREQUESTs
    result = self._device_mac.upper() in mac_addresses
    LOGGER.info('DHCPREQUEST detected from device: ' + str(result))

    # Check the unique MAC addresses to see if they match the device
    for mac_address in mac_addresses:
      LOGGER.info('DHCPREQUEST from MAC address: ' + mac_address)
      result &= self._device_mac.upper() == mac_address
    return result

  def _connection_target_ping(self):
    LOGGER.info('Running connection.target_ping')

    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4(self)

    if self._device_ipv4_addr is None:
      LOGGER.error('No device IP could be resolved')
      sys.exit(1)
    else:
      return self._ping(self._device_ipv4_addr)

  def _get_oui_manufacturer(self, mac_address):
    # Do some quick fixes on the format of the mac_address
    # to match the oui file pattern
    mac_address = mac_address.replace(':', '-').upper()
    with open(OUI_FILE, 'r', encoding='UTF-8') as file:
      for line in file:
        if mac_address.startswith(line[:8]):
          start = line.index('(hex)') + len('(hex)')
          return line[start:].strip()  # Extract the company name
    return None

  def _ping(self, host):
    cmd = 'ping -c 1 ' + str(host)
    success = util.run_command(cmd, output=False)
    return success
