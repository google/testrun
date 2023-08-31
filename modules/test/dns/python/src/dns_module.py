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
"""DNS test module"""
import subprocess
from test_module import TestModule

LOG_NAME = 'test_dns'
DNS_SERVER_CAPTURE_FILE = '/runtime/network/dns.pcap'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
LOGGER = None


class DNSModule(TestModule):
  """DNS Test module"""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    self._dns_server = '10.10.10.4'
    global LOGGER
    LOGGER = self._get_logger()

  def _has_dns_traffic(self, tcpdump_filter):
    dns_server_queries = self._exec_tcpdump(tcpdump_filter,
                                            DNS_SERVER_CAPTURE_FILE)
    LOGGER.info('DNS Server queries found: ' + str(len(dns_server_queries)))

    dns_startup_queries = self._exec_tcpdump(tcpdump_filter,
                                             STARTUP_CAPTURE_FILE)
    LOGGER.info('Startup DNS queries found: ' + str(len(dns_startup_queries)))

    dns_monitor_queries = self._exec_tcpdump(tcpdump_filter,
                                             MONITOR_CAPTURE_FILE)
    LOGGER.info('Monitor DNS queries found: ' + str(len(dns_monitor_queries)))

    num_query_dns = len(dns_server_queries) + len(dns_startup_queries) + len(
        dns_monitor_queries)
    LOGGER.info('DNS queries found: ' + str(num_query_dns))

    return num_query_dns > 0

  def _dns_network_from_dhcp(self):
    LOGGER.info('Running dns.network.from_dhcp')
    result = None
    LOGGER.info('Checking DNS traffic for configured DHCP DNS server: ' +
                self._dns_server)

    # Check if the device DNS traffic is to appropriate local
    # DHCP provided server
    tcpdump_filter = (f'dst port 53 and dst host {self._dns_server} ' +
                       'and ether src {self._device_mac}')
    dns_packets_local = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)

    # Check if the device sends any DNS traffic to non-DHCP provided server
    tcpdump_filter = (f'dst port 53 and dst not host {self._dns_server} ' +
                       'ether src {self._device_mac}')
    dns_packets_not_local = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)

    if dns_packets_local or dns_packets_not_local:
      if dns_packets_not_local:
        result = False, 'DNS traffic detected to non-DHCP provided server'
      else:
        LOGGER.info('DNS traffic detected only to configured DHCP DNS server')
        result = True, 'DNS traffic detected only to DHCP provided server'
    else:
      LOGGER.info('No DNS traffic detected from the device')
      result = None, 'No DNS traffic detected from the device'
    return result

  def _dns_network_hostname_resolution(self):
    LOGGER.info('Running dns.network.hostname_resolution')
    result = None
    LOGGER.info('Checking DNS traffic from device: ' + self._device_mac)

    # Check if the device DNS traffic
    tcpdump_filter = f'dst port 53 and ether src {self._device_mac}'
    dns_packetes = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)

    if dns_packetes:
      LOGGER.info('DNS traffic detected from device')
      result = True, 'DNS traffic detected from device'
    else:
      LOGGER.info('No DNS traffic detected from the device')
      result = False, 'No DNS traffic detected from the device'
    return result

  def _dns_mdns(self):
    LOGGER.info('Running dns.mdns')
    result = None
    # Check if the device sends any MDNS traffic
    tcpdump_filter = f'udp port 5353 and ether src {self._device_mac}'
    dns_packetes = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)

    if dns_packetes:
      LOGGER.info('MDNS traffic detected from device')
      result = True, 'MDNS traffic detected from device'
    else:
      LOGGER.info('No MDNS traffic detected from the device')
      result = None, 'No MDNS traffic detected from the device'
    return result

  def _exec_tcpdump(self, tcpdump_filter, capture_file):
    """
    Args
        tcpdump_filter: Filter to pass onto tcpdump file
        capture_file: Optional capture file to look
    Returns
        List of packets matching the filter
    """
    command = f'tcpdump -tttt -n -r {capture_file} {tcpdump_filter}'

    LOGGER.debug('tcpdump command: ' + command)

    process = subprocess.Popen(command,
                               universal_newlines=True,
                               shell=True,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    text = str(process.stdout.read()).rstrip()

    LOGGER.debug('tcpdump response: ' + text)

    if text:
      return text.split('\n')

    return []
