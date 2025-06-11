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
import time
import traceback
import os
from scapy.error import Scapy_Exception
from scapy.all import rdpcap, DHCP, ARP, Ether, ICMP, IPv6, ICMPv6ND_NS
from test_module import TestModule
from dhcp1.client import Client as DHCPClient1
from dhcp2.client import Client as DHCPClient2
from host.client import Client as HostClient
from dhcp_util import DHCPUtil
from port_stats_util import PortStatsUtil
import json

LOG_NAME = 'test_connection'
OUI_FILE = '/usr/local/etc/oui.txt'
DEFAULT_BIN_DIR = '/testrun/bin'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
DHCP_CAPTURE_FILE = '/runtime/network/dhcp-1.pcap'
SLAAC_PREFIX = 'fd10:77be:4186'
TR_CONTAINER_MAC_PREFIX = '9a:02:57:1e:8f:'
LOGGER = None

# Should be at least twice as much as the max lease time
# set in the DHCP server
LEASE_WAIT_TIME_DEFAULT = 60


class ConnectionModule(TestModule):
  """Connection Test module"""

  def __init__(self, # pylint: disable=R0917
               module,
               conf_file=None,
               results_dir=None,
               startup_capture_file=STARTUP_CAPTURE_FILE,
               monitor_capture_file=MONITOR_CAPTURE_FILE,
               bin_dir=DEFAULT_BIN_DIR):

    super().__init__(module_name=module,
                     log_name=LOG_NAME,
                     conf_file=conf_file,
                     results_dir=results_dir)
    global LOGGER
    LOGGER = self._get_logger()
    self.startup_capture_file = startup_capture_file
    self.monitor_capture_file = monitor_capture_file
    self._port_stats = PortStatsUtil(logger=LOGGER)
    self.dhcp1_client = DHCPClient1()
    self.dhcp2_client = DHCPClient2()
    self.host_client = HostClient()
    self._dhcp_util = DHCPUtil(self.dhcp1_client, self.dhcp2_client, LOGGER)
    self._lease_wait_time_sec = LEASE_WAIT_TIME_DEFAULT
    self._bin_dir = bin_dir

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

  def _connection_port_link(self):
    LOGGER.info('Running connection.port_link')
    return self._port_stats.connection_port_link_test()

  def _connection_port_speed(self):
    LOGGER.info('Running connection.port_speed')
    return self._port_stats.connection_port_speed_test()

  def _connection_port_duplex(self):
    LOGGER.info('Running connection.port_duplex')
    return self._port_stats.connection_port_duplex_test()

  def _connection_switch_arp_inspection(self):
    LOGGER.info('Running connection.switch.arp_inspection')

    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4()

    if self._device_ipv4_addr is None:
      LOGGER.error('No device IP could be resolved')
      return 'Error', 'Could not resolve device IP address'

    no_arp = True

    # Read all the pcap files
    packets = rdpcap(self.startup_capture_file) + rdpcap(
        self.monitor_capture_file)
    for packet in packets:

      # We are not interested in packets unless they are ARP packets
      if not ARP in packet:
        continue

      # We are only interested in packets from the device
      if packet.src != self._device_mac:
        continue

      # Get the ARP packet
      arp_packet = packet[ARP]
      no_arp = False

      # Check MAC address matches IP address
      if (arp_packet.hwsrc == self._device_mac
          and (arp_packet.psrc not in (self._device_ipv4_addr, '0.0.0.0'))
          and not arp_packet.psrc.startswith('169.254')):
        LOGGER.info(f'Bad ARP packet detected for MAC: {self._device_mac}')
        LOGGER.info(f'''ARP packet from IP {arp_packet.psrc}
                    does not match {self._device_ipv4_addr}''')
        return False, 'Device is sending false ARP response'

    if no_arp:
      return None, 'No ARP packets from the device found'

    return True, 'Device uses ARP correctly'

  def _connection_switch_dhcp_snooping(self):
    LOGGER.info('Running connection.switch.dhcp_snooping')

    disallowed_dhcp_types = [2, 4, 5, 6, 9, 10, 12, 13, 15, 17]

    # Read all the pcap files
    packets = rdpcap(self.startup_capture_file) + rdpcap(
        self.monitor_capture_file)
    for packet in packets:

      # We are not interested in packets unless they are DHCP packets
      if not DHCP in packet:
        continue

      # We are only interested in packets from the device
      if packet.src != self._device_mac:
        continue

      dhcp_type = self._get_dhcp_type(packet)
      if dhcp_type in disallowed_dhcp_types:

        # Check if packet is responding with port unreachable
        if ICMP in packet and packet[ICMP].type == 3:
          continue

        return False, 'Device has sent disallowed DHCP message'

    return True, 'Device does not act as a DHCP server'

  def _connection_private_address(self, config):
    LOGGER.info('Running connection.private_address')
    return self._run_subnet_test(config)

  def _connection_shared_address(self, config):
    LOGGER.info('Running connection.shared_address')
    return self._run_subnet_test(config)

  def _connection_dhcp_address(self):
    LOGGER.info('Running connection.dhcp_address')
    lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                          timeout=self._lease_wait_time_sec)
    if lease is None:
      message = (f'No DHCP lease could be found for MAC {self._device_mac}' +
                  ' at the time of this test')
      LOGGER.info(message)
      return False, message
    if 'ip' not in lease:
      message = f'No IP information found in lease: {self._device_mac}'
      LOGGER.info(message)
      return False, message
    ip_addr = lease['ip']
    LOGGER.info('IP Resolved: ' + ip_addr)
    LOGGER.info('Attempting to ping device...')
    ping_success = self._ping(self._device_ipv4_addr)
    LOGGER.debug('Ping success: ' + str(ping_success))
    if not ping_success:
      return False, 'Device did not respond to leased IP address'
    return True, 'Device responded to leased IP address'

  def _connection_mac_address(self):
    LOGGER.info('Running connection.mac_address')
    if self._device_mac is  None:
      LOGGER.info('No MAC address found: ' + self._device_mac)
      return False, 'No MAC address found.'
    message = f'MAC address found: {self._device_mac}'
    LOGGER.info(message)
    return True, message

  def _connection_mac_oui(self):
    LOGGER.info('Running connection.mac_oui')
    manufacturer = self._get_oui_manufacturer(self._device_mac)
    if manufacturer is None:
      msg = f'No OUI Manufacturer found for: {self._device_mac}'
      LOGGER.info(msg)
      return False, msg
    msg = f'OUI Manufacturer found: {manufacturer}'
    LOGGER.info(msg)
    return True, msg

  def _connection_single_ip(self):
    LOGGER.info('Running connection.single_ip')

    result = None
    if self._device_mac is None:
      LOGGER.info('No MAC address found.')
      return result, 'No MAC address found.'

    # Read all the pcap files containing DHCP packet information
    packets = rdpcap(self.startup_capture_file) + rdpcap(
        self.monitor_capture_file)

    # Extract MAC addresses from DHCP packets
    mac_addresses = set()
    LOGGER.info('Inspecting: ' + str(len(packets)) + ' packets')
    for packet in packets:
      if DHCP in packet:
        if self._get_dhcp_type(packet) == 3:
          mac_address = packet[Ether].src
          LOGGER.info('DHCPREQUEST detected MAC address: ' + mac_address)
          if (not mac_address.startswith(TR_CONTAINER_MAC_PREFIX)
              and mac_address != self._dev_iface_mac):
            mac_addresses.add(mac_address.upper())

    # Check if the device mac address is in the list of DHCPREQUESTs
    result = self._device_mac.upper() in mac_addresses
    LOGGER.info('DHCPREQUEST detected from device: ' + str(result))

    if not result:
      return result, 'Device did not request a DHCP address.'

    # Check the unique MAC addresses to see if they match the device
    for mac_address in mac_addresses:
      result &= self._device_mac.upper() == mac_address

    if result:
      return result, 'Device is using a single IP address'
    else:
      return result, 'Device is using multiple IP addresses'

  def _get_dhcp_type(self, packet):
    for option in packet[DHCP].options:
      if 'message-type' in option:
        return option[1]

  def _connection_target_ping(self):
    LOGGER.info('Running connection.target_ping')

    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4()

    if self._device_ipv4_addr is None:
      LOGGER.error('No device IP could be resolved')
      return 'Error', 'Could not resolve device IP address'
    if not self._ping(self._device_ipv4_addr):
      return False, 'Device does not respond to ping'
    return True, 'Device responds to ping'

  def _connection_ipaddr_ip_change(self, config):
    LOGGER.info('Running connection.ipaddr.ip_change')
    # Resolve the configured lease wait time
    if (not 'lease_wait_time_sec' in config or
      not self._dhcp_util.setup_single_dhcp_server()):
      return None, 'Failed to configure network for test'
    self._lease_wait_time_sec = config['lease_wait_time_sec']
    lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=self._lease_wait_time_sec)
    if lease is  None:
      message = ('Device has no current DHCP lease so ' +
                    'this test could not be run')
      LOGGER.info(message)
      return None, message
    LOGGER.info('Current device lease resolved')
    LOGGER.debug(str(lease))
    # Figure out how to calculate a valid IP address
    ip_address = '10.10.10.30'
    if not self._dhcp_util.add_reserved_lease(lease['hostname'],
                                              lease['hw_addr'], ip_address):
      return None, 'Failed to create reserved lease for device'
    self._dhcp_util.wait_for_lease_expire(lease,
                                          self._lease_wait_time_sec)
    LOGGER.info('Checking device accepted new IP')
    for _ in range(5):
      LOGGER.info('Pinging device at IP: ' + ip_address)
      if self._ping(ip_address):
        LOGGER.debug('Ping success')
        LOGGER.debug('Reserved lease confirmed active in device')
        result = True, 'Device has accepted an IP address change'
        LOGGER.debug('Restoring DHCP failover configuration')
        break
      else:
        LOGGER.info('Device did not respond to ping')
        result = False, 'Device did not accept IP address change'
        time.sleep(5)  # Wait 5 seconds before trying again
    self._dhcp_util.delete_reserved_lease(lease['hw_addr'])
    # Restore the network
    self._dhcp_util.restore_failover_dhcp_server()
    LOGGER.info('Waiting 30 seconds for reserved lease to expire')
    time.sleep(30)
    self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                timeout=self._lease_wait_time_sec)
    return result

  def _connection_ipaddr_dhcp_failover(self, config):
    LOGGER.info('Running connection.ipaddr.dhcp_failover')
    # Resolve the configured lease wait time
    if 'lease_wait_time_sec' in config:
      self._lease_wait_time_sec = config['lease_wait_time_sec']
    # Confirm that both servers are online
    primary_status = self._dhcp_util.get_dhcp_server_status(
        dhcp_server_primary=True)
    secondary_status = self._dhcp_util.get_dhcp_server_status(
        dhcp_server_primary=False)
    if not primary_status or not secondary_status:
      LOGGER.error('Network is not ready for this test. Skipping')
      return None, 'Network is not ready for this test'
    lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=self._lease_wait_time_sec)
    if lease is None:
      return (
            None,
            'Device has no current DHCP lease so this test could not be run')
    LOGGER.info('Current device lease resolved')
    if not self._dhcp_util.is_lease_active(lease):
      return False, 'Device did not respond to ping'
    # Shutdown the primary server
    if not self._dhcp_util.stop_dhcp_server(dhcp_server_primary=True):
      return None, 'Failed to shutdown primary DHCP server'
    # Wait until the current lease is expired
    self._dhcp_util.wait_for_lease_expire(lease,
                                          self._lease_wait_time_sec)
    # Make sure the device has received a new lease from the
    # secondary server
    lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                             timeout=self._lease_wait_time_sec)
    if lease is None:
      return False, ('Device did not recieve a new lease from '
                               'secondary DHCP server')
    if not self._dhcp_util.is_lease_active(lease):
      return False, 'Could not validate lease is active in device'
    return True, ('Secondary DHCP server lease confirmed active '
                                'in device')

  def _connection_dhcp_disconnect(self) -> tuple[str | bool, str]:
    LOGGER.info('Running connection.dhcp.disconnect')
    dev_iface = os.getenv('DEV_IFACE')
    rpc_error_msg = 'Unable to connect to gRPC server'
    try:
      iface_status = self.host_client.check_interface_status(dev_iface)
    except Exception:
      LOGGER.error(rpc_error_msg)
      return 'Error', rpc_error_msg
    if iface_status.code != 200:
      return 'Error', 'Device interface could not be resolved'
    LOGGER.info('Successfully resolved iface status')
    if not iface_status.status:
      return 'Error', 'Device interface is down'
    lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=self._lease_wait_time_sec)
    if lease is None or not self._dhcp_util.is_lease_active(lease):
      return 'Error', 'No active lease available for device'
    try:
      # Disable the device interface
      iface_down = self.host_client.set_iface_down(dev_iface)
    except Exception:
      LOGGER.error(rpc_error_msg)
      return 'Error', rpc_error_msg
    if not iface_down:
      return 'Error', 'Failed to set device interface to down state'
    LOGGER.info('Device interface set to down state')

    # Wait for the lease to expire
    self._dhcp_util.wait_for_lease_expire(lease,
                                          self._lease_wait_time_sec)

    # Wait an additonal 10 seconds to better test a true disconnect
    # state
    LOGGER.info('Waiting 10 seconds before bringing iface back up')
    time.sleep(10)
    try:
      # Enable the device interface
      iface_up = self.host_client.set_iface_up(dev_iface)
    except Exception:
      LOGGER.error(rpc_error_msg)
      return 'Error', rpc_error_msg
    if not iface_up:
      return 'Error', 'Failed to set device interface to up state'
    LOGGER.info('Device interface set to up state')
    # Confirm device receives a new lease
    lease = self._dhcp_util.get_cur_lease(
                      mac_address=self._device_mac,
                      timeout=self._lease_wait_time_sec)
    if lease is None:
      return False, 'Device did not recieve a DHCP lease after disconnect'
    if not self._dhcp_util.is_lease_active(lease):
      return False, 'Could not confirm DHCP lease active after disconnect'
    return True, 'Device received a DHCP lease after disconnect'

  def _connection_dhcp_disconnect_ip_change(self):
    LOGGER.info('Running connection.dhcp.disconnect_ip_change')
    result = None
    description = ''
    reserved_lease = None
    dev_iface = os.getenv('DEV_IFACE')
    if self._dhcp_util.setup_single_dhcp_server():
      try:
        iface_status = self.host_client.check_interface_status(dev_iface)
        if iface_status.code == 200:
          LOGGER.info('Successfully resolved iface status')
          if iface_status.status:
            lease = self._dhcp_util.get_cur_lease(
                mac_address=self._device_mac, timeout=self._lease_wait_time_sec)
            if lease is not None:
              LOGGER.info('Current device lease resolved')
              if self._dhcp_util.is_lease_active(lease):

                # Add a reserved lease with a different IP
                ip_address = '10.10.10.30'
                reserved_lease = self._dhcp_util.add_reserved_lease(
                    lease['hostname'], self._device_mac, ip_address)

                # Disable the device interface
                iface_down = self.host_client.set_iface_down(dev_iface)
                if iface_down:
                  LOGGER.info('Device interface set to down state')

                  # Wait for the lease to expire
                  self._dhcp_util.wait_for_lease_expire(lease,
                                                    self._lease_wait_time_sec)

                  if reserved_lease:
                    # Wait an additonal 10 seconds to better test a true
                    # disconnect state
                    LOGGER.info(
                        'Waiting 10 seconds before bringing iface back up')
                    time.sleep(10)

                    # Enable the device interface
                    iface_up = self.host_client.set_iface_up(dev_iface)
                    if iface_up:
                      LOGGER.info('Device interface set to up state')
                      # Confirm device receives a new lease
                      reserved_lease_accepted = False
                      LOGGER.info('Checking device accepted new IP')
                      for _ in range(5):
                        LOGGER.info('Pinging device at IP: ' + ip_address)
                        if self._ping(ip_address):
                          LOGGER.debug('Ping success')
                          LOGGER.debug(
                              'Reserved lease confirmed active in device')
                          reserved_lease_accepted = True
                          break
                        else:
                          LOGGER.info('Device did not respond to ping')
                          time.sleep(5)  # Wait 5 seconds before trying again

                      if reserved_lease_accepted:
                        result = True
                        description = ('Device received expected IP address '
                                      'after disconnect')
                      else:
                        result = False
                        description = (
                          'Could not confirm DHCP lease active after disconnect'
                        )
                    else:
                      result = 'Error'
                      description = 'Failed to set device interface to up state'
                  else:
                    result = 'Error'
                    description = (
                      'Failed to set reserved address in DHCP server'
                    )
                else:
                  result = 'Error'
                  description = 'Failed to set device interface to down state'
            else:
              result = 'Error'
              description = 'No active lease available for device'
          else:
            result = 'Error'
            description = 'Device interface is down'
        else:
          result = 'Error'
          description = 'Device interface could not be resolved'
      except Exception:
        LOGGER.error('Unable to connect to gRPC server')
        result = 'Error'
        description = (
        'Unable to connect to gRPC server'
        )
    else:
      result = 'Error'
      description = 'Failed to configure network for test'

    if reserved_lease:
      self._dhcp_util.delete_reserved_lease(self._device_mac)

    # Restore the network
    self._dhcp_util.restore_failover_dhcp_server()
    LOGGER.info('Waiting 30 seconds for reserved lease to expire')
    time.sleep(30)
    self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                  timeout=self._lease_wait_time_sec)
    return result, description

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

  def _connection_ipv6_slaac(self):
    LOGGER.info('Running connection.ipv6_slaac')
    slac_test, sends_ipv6 = self._has_slaac_address()
    if slac_test:
      return True, f'Device has formed SLAAC address {self._device_ipv6_addr}'
    elif slac_test is None:
      return 'Error', 'An error occurred whilst running this test'
    else:
      if sends_ipv6:
        LOGGER.info('Device does not support IPv6 SLAAC')
        return False, 'Device does not support IPv6 SLAAC'
      else:
        LOGGER.info('Device does not support IPv6')
        return False, 'Device does not support IPv6'

  def _has_slaac_address(self):
    packet_capture = (rdpcap(self.startup_capture_file) +
                      rdpcap(self.monitor_capture_file))

    try:
      packet_capture += rdpcap(DHCP_CAPTURE_FILE)
    except (FileNotFoundError, Scapy_Exception):
      LOGGER.error('dhcp-1.pcap not found or empty, ignoring')

    sends_ipv6 = False
    for packet_number, packet in enumerate(packet_capture, start=1):
      if IPv6 in packet and packet.src == self._device_mac:
        sends_ipv6 = True
        if ICMPv6ND_NS in packet:
          ipv6_addr = str(packet[ICMPv6ND_NS].tgt)
          if ipv6_addr.startswith(SLAAC_PREFIX):
            self._device_ipv6_addr = ipv6_addr
            LOGGER.info('SLAAC address detected at packet number' +
                        f'{packet_number}')
            LOGGER.info(f'Device has formed SLAAC address {ipv6_addr}')
            return True, sends_ipv6
    return False, sends_ipv6

  def _connection_ipv6_ping(self):
    LOGGER.info('Running connection.ipv6_ping')
    if self._device_ipv6_addr is None:
      LOGGER.info('No IPv6 SLAAC address found. Cannot ping')
      return False, 'No IPv6 SLAAC address found. Cannot ping'
    if self._ping(self._device_ipv6_addr, ipv6=True):
      LOGGER.info(f'Device responds to IPv6 ping on {self._device_ipv6_addr}')
      return True, f'Device responds to IPv6 ping on {self._device_ipv6_addr}'
    LOGGER.info('Device does not respond to IPv6 ping')
    return False, 'Device does not respond to IPv6 ping'

  def _ping(self, host, ipv6=False):
    LOGGER.info('Pinging: ' + str(host))
    cmd = 'ping -c 1 '
    cmd += ' -6 ' if ipv6 else ''
    cmd += str(host)
    #cmd = 'ping -c 1 ' + str(host)
    success = util.run_command(cmd, output=False)  # pylint: disable=E1120
    return success

  def restore_failover_dhcp_server(self, subnet):
    # Configure the subnet range
    if self._change_subnet(subnet):
      if self.enable_failover():
        response = self.dhcp2_client.start_dhcp_server()
        if response.code == 200:
          LOGGER.info('DHCP server configuration restored')
          return True
        LOGGER.error('Failed to start secondary DHCP server')
        return False
      LOGGER.error('Failed to enabled failover in primary DHCP server')
      return False
    LOGGER.error('Failed to restore original subnet')
    return False

  def setup_single_dhcp_server(self):
    # Shutdown the secondary DHCP Server
    LOGGER.info('Stopping secondary DHCP server')
    response = self.dhcp2_client.stop_dhcp_server()
    if response.code != 200:
      return False, 'Secondary DHCP server stop command failed'
    LOGGER.info('Secondary DHCP server stop command success')
    time.sleep(3)  # Give some time for the server to stop
    LOGGER.info('Checking secondary DHCP server status')
    response = self.dhcp2_client.get_status()
    if response.code != 200:
      return False, 'Secondary DHCP server still running'
    LOGGER.info('Secondary DHCP server stopped')
    LOGGER.info('Configuring primary DHCP server')
    # Move primary DHCP server from failover into
    # a single DHCP server config
    response = self.dhcp1_client.disable_failover()
    if response.code != 200:
      return False, 'Failed to disable primary DHCP server failover'
    LOGGER.info('Primary DHCP server failover disabled')
    return True, 'Single DHCP server configured'

  def _communication_network_type(self):
    try:
      result = 'Informational'
      description = ''
      details = ''
      packets = self.get_network_packet_types()
      details = packets
      # Initialize a list for detected packet types
      packet_types = []

      # Check for the presence of each packet type and append to the list
      if (packets['multicast']['from'] > 0) or (packets['multicast']['to'] > 0):
        packet_types.append('Multicast')
      if (packets['broadcast']['from'] > 0) or (packets['broadcast']['to'] > 0):
        packet_types.append('Broadcast')
      if (packets['unicast']['from'] > 0) or (packets['unicast']['to'] > 0):
        packet_types.append('Unicast')

      # Construct the description if any packet types were detected
      if packet_types:
        description = 'Packet types detected: ' + ', '.join(packet_types)
      else:
        description = 'No multicast, broadcast or unicast detected'

    except Exception as e:  # pylint: disable=W0718
      LOGGER.error(e)
      result = 'Error'
    return result, description, details

  def get_network_packet_types(self):
    combined_results = {
        'mac_address': self._device_mac,
        'multicast': {
            'from': 0,
            'to': 0
        },
        'broadcast': {
            'from': 0,
            'to': 0
        },
        'unicast': {
            'from': 0,
            'to': 0
        },
    }
    capture_files = [self.startup_capture_file, self.monitor_capture_file]
    for capture_file in capture_files:
      bin_file = self._bin_dir + '/get_packet_counts.sh'
      args = f'"{capture_file}" "{self._device_mac}"'
      command = f'{bin_file} {args}'
      response = util.run_command(command)
      packets = json.loads(response[0].strip())
      # Combine results
      combined_results['multicast']['from'] += packets['multicast']['from']
      combined_results['multicast']['to'] += packets['multicast']['to']
      combined_results['broadcast']['from'] += packets['broadcast']['from']
      combined_results['broadcast']['to'] += packets['broadcast']['to']
      combined_results['unicast']['from'] += packets['unicast']['from']
      combined_results['unicast']['to'] += packets['unicast']['to']
    return combined_results

  def enable_failover(self):
    # Move primary DHCP server to primary failover
    LOGGER.info('Configuring primary failover DHCP server')
    response = self.dhcp1_client.enable_failover()
    if response.code == 200:
      LOGGER.info('Primary DHCP server enabled')
      return True
    LOGGER.error('Failed to disable primary DHCP server failover')
    return False

  def is_ip_in_range(self, ip, start_ip, end_ip):
    ip_int = int(''.join(format(int(octet), '08b') for octet in ip.split('.')),
                 2)
    start_int = int(
        ''.join(format(int(octet), '08b') for octet in start_ip.split('.')), 2)
    end_int = int(
        ''.join(format(int(octet), '08b') for octet in end_ip.split('.')), 2)

    return start_int <= ip_int <= end_int

  def _run_subnet_test(self, config):

    # Resolve the configured dhcp subnet ranges
    ranges = None
    if 'ranges' in config:
      ranges = config['ranges']
    else:
      LOGGER.error('No subnet ranges configured for test. Skipping')
      return None, 'No subnet ranges configured for test'

    # Resolve the configured lease wait time
    if 'lease_wait_time_sec' in config:
      self._lease_wait_time_sec = config['lease_wait_time_sec']

    response = self.dhcp1_client.get_dhcp_range()
    cur_range = {}

    if response.code == 200:
      cur_range['start'] = response.start
      cur_range['end'] = response.end
      LOGGER.info('Current DHCP subnet range: ' + str(cur_range))
    else:
      LOGGER.error('Failed to resolve current subnet range required '
                   'for restoring network')
      return None, ('Failed to resolve current subnet range required '
                    'for restoring network')

    results = []
    dhcp_setup = self.setup_single_dhcp_server()

    if dhcp_setup[0]:
      LOGGER.info(dhcp_setup[1])
      lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=self._lease_wait_time_sec)

      if lease is not None:
        if self._dhcp_util.is_lease_active(lease):
          results = self.test_subnets(ranges)
      else:
        LOGGER.info('Device has no current DHCP lease ' +
                    'so this test could not be run')
        return (
            None,
            'Device has no current DHCP lease so this test could not be run')
    else:
      LOGGER.error(dhcp_setup[1])
      return None, 'Failed to setup DHCP server for test'

    # Process and return final results
    final_result = None
    final_result_details = ''
    for result in results:
      if final_result is None:
        final_result = result['result']
      else:
        if result['result'] is not None:
          final_result &= result['result']
        if not result['result']:
          final_result_details += result['details'] + '\n'

    if final_result:
      final_result_details = 'All subnets are supported'

    try:
      # Restore failover configuration of DHCP servers
      self.restore_failover_dhcp_server(cur_range)

      # Wait for the current lease to expire
      lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=self._lease_wait_time_sec)

      # Check if lease is active
      if lease is not None:
        self._dhcp_util.wait_for_lease_expire(lease, self._lease_wait_time_sec)
      else:
        # If not, wait for 30 seconds as a fallback
        time.sleep(30)

      # Wait for a new lease to be provided before exiting test
      # to prevent other test modules from failing

      LOGGER.info('Checking for new lease')
      # Subnet changes tend to take longer to pick up so we'll allow
      # for twice the lease wait time
      lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=2 *
                                            self._lease_wait_time_sec)
      if lease is not None:
        LOGGER.info('Validating subnet for new lease...')
        in_range = self.is_ip_in_range(lease['ip'], cur_range['start'],
                                       cur_range['end'])
        LOGGER.debug('Lease within subnet: ' + str(in_range))
      else:
        LOGGER.info('New lease not found. Waiting to check again')

    except Exception:  # pylint: disable=W0718
      LOGGER.error('Failed to restore DHCP server configuration')

    return final_result, final_result_details

  def _test_subnet(self, subnet, lease):
    LOGGER.info('Testing subnet: ' + str(subnet))
    if self._change_subnet(subnet):
      self._dhcp_util.wait_for_lease_expire(lease, self._lease_wait_time_sec)
      LOGGER.debug('Checking for new lease')
      # Subnet changes tend to take longer to pick up so we'll allow
      # for twice the lease wait time
      lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=2 *
                                            self._lease_wait_time_sec)
      if lease is not None:
        LOGGER.debug('New lease found: ' + str(lease))
        LOGGER.debug('Validating subnet for new lease...')
        in_range = self.is_ip_in_range(lease['ip'], subnet['start'],
                                       subnet['end'])
        LOGGER.info('Lease within subnet: ' + str(in_range))
        return in_range
      else:
        LOGGER.info('Device did not receive lease in subnet')
        return False
    else:
      LOGGER.error('Failed to change subnet')

  def _change_subnet(self, subnet):
    LOGGER.info('Changing subnet to: ' + str(subnet))
    response = self.dhcp1_client.set_dhcp_range(subnet['start'], subnet['end'])
    if response.code == 200:
      LOGGER.debug('Subnet change request accepted. Confirming change...')
      response = self.dhcp1_client.get_dhcp_range()
      if response.code == 200:
        if response.start == subnet['start'] and response.end == subnet['end']:
          LOGGER.debug('Subnet change confirmed')
          return True
      LOGGER.debug('Failed to confirm subnet change')
    LOGGER.debug('Subnet change request failed.')
    return False

  def test_subnets(self, subnets):
    results = []
    for subnet in subnets:
      result = {}
      try:
        lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                              timeout=self._lease_wait_time_sec)
        if lease is not None:
          result = self._test_subnet(subnet, lease)
          if result:
            result = {
                'result':
                True,
                'details':
                'Subnet ' + subnet['start'] + '-' + subnet['end'] + ' passed'
            }
          else:
            result = {
                'result':
                False,
                'details':
                'Subnet ' + subnet['start'] + '-' + subnet['end'] + ' failed'
            }
        else:
          result = {
              'result':
              None,
              'details':
              'Device does not have active lease, cannot test subnet change. ' +
              'Subnet ' + subnet['start'] + '-' + subnet['end'] + ' skipped'
          }
      except Exception as e:  # pylint: disable=W0718
        LOGGER.error('Subnet test failed: ' + str(e))
        LOGGER.error(traceback.format_exc())
        result = {'result': False, 'details': 'Subnet test failed: ' + str(e)}
      results.append(result)
    return results
