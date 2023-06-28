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
from scapy.all import *
from test_module import TestModule

LOG_NAME = "test_connection"
LOGGER = None
OUI_FILE="/usr/local/etc/oui.txt"
DHCP_SERVER_CAPTURE_FILE = '/runtime/network/dhcp-1.pcap'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'

TR_CONTAINER_MAC_PREFIX = '9a:02:57:1e:8f:'


class ConnectionModule(TestModule):
  """Connection Test module"""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    global LOGGER
    LOGGER = self._get_logger()

  def _connection_mac_address(self):
    LOGGER.info("Running connection.mac_address")
    if self._device_mac is not None:
      LOGGER.info("MAC address found: " + self._device_mac)
      return True, "MAC address found: " + self._device_mac
    else:
      LOGGER.info("No MAC address found: " + self._device_mac)
      return False, "No MAC address found."

  def _connection_mac_oui(self):
    LOGGER.info("Running connection.mac_oui")
    manufacturer = self._get_oui_manufacturer(self._device_mac)
    if manufacturer is not None:
      LOGGER.info("OUI Manufacturer found: " + manufacturer)
      return True, "OUI Manufacturer found: " + manufacturer
    else:
      LOGGER.info("No OUI Manufacturer found for: " + self._device_mac)
      return False, "No OUI Manufacturer found for: " + self._device_mac

  def _connection_single_ip(self):
    LOGGER.info("Running connection.single_ip")

    result = None
    if self._device_mac is None:
      LOGGER.info("No MAC address found: ")
      return result, "No MAC address found."
      
    # Read all the pcap files containing DHCP packet information
    packets = rdpcap(DHCP_SERVER_CAPTURE_FILE)
    packets.append(rdpcap(STARTUP_CAPTURE_FILE))
    packets.append(rdpcap(MONITOR_CAPTURE_FILE))

    # Extract MAC addresses from DHCP packets
    mac_addresses = set()
    LOGGER.info("Inspecting: " + str(len(packets)) + " packets")
    for packet in packets:
      # Option[1] = message-type, option 3 = DHCPREQUEST
        if DHCP in packet and packet[DHCP].options[0][1] == 3: 
            mac_address = packet[Ether].src
            if not mac_address.startswith(TR_CONTAINER_MAC_PREFIX):
              mac_addresses.add(mac_address.upper())

    # Check if the device mac address is in the list of DHCPREQUESTs
    result = self._device_mac.upper() in mac_addresses
    LOGGER.info("DHCPREQUEST detected from device: " + str(result))

    # Check the unique MAC addresses to see if they match the device
    for mac_address in mac_addresses:
        LOGGER.info("DHCPREQUEST from MAC address: " + mac_address)
        result &= self._device_mac.upper() == mac_address
    return result


  def _connection_target_ping(self):
    LOGGER.info("Running connection.target_ping")

    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
       self._device_ipv4_addr = self._get_device_ipv4(self)

    if self._device_ipv4_addr is None:
      LOGGER.error("No device IP could be resolved")
      sys.exit(1)
    else:
      return self._ping(self._device_ipv4_addr)

  def _get_oui_manufacturer(self,mac_address):
    # Do some quick fixes on the format of the mac_address
    # to match the oui file pattern
    mac_address = mac_address.replace(":","-").upper()
    with open(OUI_FILE, "r") as file:
            for line in file:
                if mac_address.startswith(line[:8]):
                    start = line.index("(hex)") + len("(hex)")
                    return line[start:].strip()  # Extract the company name
    return None

  def _ping(self, host):
    cmd = 'ping -c 1 ' + str(host)
    success = util.run_command(cmd, output=False)
    return success
  