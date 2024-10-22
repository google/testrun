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
from scapy.all import rdpcap, DHCP, ARP, Ether, ICMP, IPv6, ICMPv6ND_NS
from test_module import TestModule
from dhcp1.client import Client as DHCPClient1
from dhcp2.client import Client as DHCPClient2
from host.client import Client as HostClient
from dhcp_util import DHCPUtil
from port_stats_util import PortStatsUtil

LOG_NAME = 'test_connection'
OUI_FILE = '/usr/local/etc/oui.txt'
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

  def __init__(self,
               module,
               log_dir=None,
               conf_file=None,
               results_dir=None,
               startup_capture_file=STARTUP_CAPTURE_FILE,
               monitor_capture_file=MONITOR_CAPTURE_FILE):

    super().__init__(module_name=module,
                     log_name=LOG_NAME,
                     log_dir=log_dir,
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

    return True, 'Device uses ARP'

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
    if lease is not None:
      if 'ip' in lease:
        ip_addr = lease['ip']
        LOGGER.info('IP Resolved: ' + ip_addr)
        LOGGER.info('Attempting to ping device...')
        ping_success = self._ping(self._device_ipv4_addr)
        LOGGER.debug('Ping success: ' + str(ping_success))
        if ping_success:
          return True, 'Device responded to leased ip address'
        else:
          return False, 'Device did not respond to leased ip address'
      else:
        LOGGER.info('No IP information found in lease: ' + self._device_mac)
        return False, 'No IP information found in lease: ' + self._device_mac
    else:
      LOGGER.info('No DHCP lease could be found: ' + self._device_mac)
      return False, 'No DHCP lease could be found: ' + self._device_mac

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
    else:
      if self._ping(self._device_ipv4_addr):
        return True, 'Device responds to ping'
      else:
        return False, 'Device does not respond to ping'

  def _connection_ipaddr_ip_change(self, config):
    result = None
    LOGGER.info('Running connection.ipaddr.ip_change')
    # Resolve the configured lease wait time
    if 'lease_wait_time_sec' in config:
      self._lease_wait_time_sec = config['lease_wait_time_sec']

    if self._dhcp_util.setup_single_dhcp_server():
      lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=self._lease_wait_time_sec)
      if lease is not None:
        LOGGER.info('Current device lease resolved')
        LOGGER.debug(str(lease))
        # Figure out how to calculate a valid IP address
        ip_address = '10.10.10.30'
        if self._dhcp_util.add_reserved_lease(lease['hostname'],
                                              lease['hw_addr'], ip_address):
          self._dhcp_util.wait_for_lease_expire(lease,
                                                self._lease_wait_time_sec)
          LOGGER.info('Checking device accepted new ip')
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
        else:
          result = None, 'Failed to create reserved lease for device'
      else:
        LOGGER.info('Device has no current DHCP lease')
        result = None, 'Device has no current DHCP lease'
      # Restore the network
      self._dhcp_util.restore_failover_dhcp_server()
      LOGGER.info('Waiting 30 seconds for reserved lease to expire')
      time.sleep(30)
      self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                    timeout=self._lease_wait_time_sec)
    else:
      result = None, 'Failed to configure network for test'
    return result

  def _connection_ipaddr_dhcp_failover(self, config):
    result = None
    LOGGER.info('Running connection.ipaddr.dhcp_failover')

    # Resolve the configured lease wait time
    if 'lease_wait_time_sec' in config:
      self._lease_wait_time_sec = config['lease_wait_time_sec']

    # Confirm that both servers are online
    primary_status = self._dhcp_util.get_dhcp_server_status(
        dhcp_server_primary=True)
    secondary_status = self._dhcp_util.get_dhcp_server_status(
        dhcp_server_primary=False)
    if primary_status and secondary_status:
      lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=self._lease_wait_time_sec)
      if lease is not None:
        LOGGER.info('Current device lease resolved')
        if self._dhcp_util.is_lease_active(lease):
          # Shutdown the primary server
          if self._dhcp_util.stop_dhcp_server(dhcp_server_primary=True):
            # Wait until the current lease is expired
            self._dhcp_util.wait_for_lease_expire(lease,
                                                  self._lease_wait_time_sec)
            # Make sure the device has received a new lease from the
            # secondary server
            if self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                             timeout=self._lease_wait_time_sec):
              if self._dhcp_util.is_lease_active(lease):
                result = True, ('Secondary DHCP server lease confirmed active '
                                'in device')
              else:
                result = False, 'Could not validate lease is active in device'
            else:
              result = False, ('Device did not recieve a new lease from '
                               'secondary DHCP server')
            self._dhcp_util.start_dhcp_server(dhcp_server_primary=True)
          else:
            result = None, 'Failed to shutdown primary DHCP server'
        else:
          result = False, 'Device did not respond to ping'
      else:
        result = None, 'Device has no current DHCP lease'
    else:
      LOGGER.error('Network is not ready for this test. Skipping')
      result = None, 'Network is not ready for this test'
    return result

  def _connection_dhcp_disconnect(self):
    LOGGER.info('Running connection.dhcp.disconnect')
    result = None
    description = ''
    dev_iface = os.getenv('DEV_IFACE')
    iface_status = self.host_client.check_interface_status(dev_iface)
    if iface_status.code == 200:
      LOGGER.info('Successfully resolved iface status')
      if iface_status.status:
        lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                              timeout=self._lease_wait_time_sec)
        if lease is not None:
          LOGGER.info('Current device lease resolved')
          if self._dhcp_util.is_lease_active(lease):

            # Disable the device interface
            iface_down = self.host_client.set_iface_down(dev_iface)
            if iface_down:
              LOGGER.info('Device interface set to down state')

              # Wait for the lease to expire
              self._dhcp_util.wait_for_lease_expire(lease,
                                                    self._lease_wait_time_sec)

              # Wait an additonal 10 seconds to better test a true disconnect
              # state
              LOGGER.info('Waiting 10 seconds before bringing iface back up')
              time.sleep(10)

              # Enable the device interface
              iface_up = self.host_client.set_iface_up(dev_iface)
              if iface_up:
                LOGGER.info('Device interface set to up state')

                # Confirm device receives a new lease
                if self._dhcp_util.get_cur_lease(
                    mac_address=self._device_mac,
                    timeout=self._lease_wait_time_sec):
                  if self._dhcp_util.is_lease_active(lease):
                    result = True
                    description = (
                        'Device received a DHCP lease after disconnect')
                  else:
                    result = False
                    description = (
                        'Could not confirm DHCP lease active after disconnect')
                else:
                  result = False
                  description = (
                      'Device did not recieve a DHCP lease after disconnect')
              else:
                result = 'Error'
                description = 'Failed to set device interface to up state'
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
    return result, description

  def _connection_dhcp_disconnect_ip_change(self):
    LOGGER.info('Running connection.dhcp.disconnect_ip_change')
    result = None
    description = ''
    reserved_lease = None
    dev_iface = os.getenv('DEV_IFACE')
    if self._dhcp_util.setup_single_dhcp_server():
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
                    LOGGER.info('Checking device accepted new ip')
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
                  description = 'Failed to set reserved address in DHCP server'
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
    result = None

    slac_test, sends_ipv6 = self._has_slaac_addres()
    if slac_test:
      result = True, f'Device has formed SLAAC address {self._device_ipv6_addr}'
    if result is None:
      if sends_ipv6:
        LOGGER.info('Device does not support IPv6 SLAAC')
        result = False, 'Device does not support IPv6 SLAAC'
      else:
        LOGGER.info('Device does not support IPv6')
        result = False, 'Device does not support IPv6'
    return result

  def _has_slaac_addres(self):
    packet_capture = (rdpcap(self.startup_capture_file) +
                      rdpcap(self.monitor_capture_file))

    try:
      packet_capture += rdpcap(DHCP_CAPTURE_FILE)
    except FileNotFoundError:
      LOGGER.error('dhcp-1.pcap not found, ignoring')

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
    result = None
    if self._device_ipv6_addr is None:
      LOGGER.info('No IPv6 SLAAC address found. Cannot ping')
      result = False, 'No IPv6 SLAAC address found. Cannot ping'
    else:
      if self._ping(self._device_ipv6_addr, ipv6=True):
        LOGGER.info(f'Device responds to IPv6 ping on {self._device_ipv6_addr}')
        result = True, ('Device responds to IPv6 ping on ' +
                        f'{self._device_ipv6_addr}')
      else:
        LOGGER.info('Device does not respond to IPv6 ping')
        result = False, 'Device does not respond to IPv6 ping'
    return result

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
        else:
          LOGGER.error('Failed to start secondary DHCP server')
          return False
      else:
        LOGGER.error('Failed to enabled failover in primary DHCP server')
        return False
    else:
      LOGGER.error('Failed to restore original subnet')
      return False

  def setup_single_dhcp_server(self):
    # Shutdown the secondary DHCP Server
    LOGGER.info('Stopping secondary DHCP server')
    response = self.dhcp2_client.stop_dhcp_server()
    if response.code == 200:
      LOGGER.info('Secondary DHCP server stop command success')
      time.sleep(3)  # Give some time for the server to stop
      LOGGER.info('Checking secondary DHCP server status')
      response = self.dhcp2_client.get_status()
      if response.code == 200:
        LOGGER.info('Secondary DHCP server stopped')
        LOGGER.info('Configuring primary DHCP server')
        # Move primary DHCP server from failover into
        # a single DHCP server config
        response = self.dhcp1_client.disable_failover()
        if response.code == 200:
          LOGGER.info('Primary DHCP server failover disabled')
        else:
          return False, 'Failed to disable primary DHCP server failover'
        return True, 'Single DHCP server configured'
      else:
        return False, 'Secondary DHCP server still running'
    else:
      return False, 'Secondary DHCP server stop command failed'

  def enable_failover(self):
    # Move primary DHCP server to primary failover
    LOGGER.info('Configuring primary failover DHCP server')
    response = self.dhcp1_client.enable_failover()
    if response.code == 200:
      LOGGER.info('Primary DHCP server enabled')
      return True
    else:
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
        LOGGER.info('Failed to confirm a valid active lease for the device')
        return None, 'Failed to confirm a valid active lease for the device'
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
        if result['result']:
          final_result_details += result['details'] + '\n'

    if final_result:
      final_result_details = 'All subnets are supported'

    try:
      # Restore failover configuration of DHCP servers
      self.restore_failover_dhcp_server(cur_range)

      # Wait for the current lease to expire
      lease = self._dhcp_util.get_cur_lease(mac_address=self._device_mac,
                                            timeout=self._lease_wait_time_sec)
      self._dhcp_util.wait_for_lease_expire(lease, self._lease_wait_time_sec)

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

    except Exception as e:  # pylint: disable=W0718
      LOGGER.error('Failed to restore DHCP server configuration: ' + str(e))
      LOGGER.error(traceback.format_exc())

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
    else:
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
