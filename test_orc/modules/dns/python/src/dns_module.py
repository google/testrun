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
CAPTURE_FILE = '/runtime/network/dns.pcap'
LOGGER = None


class DNSModule(TestModule):
  """DNS Test module"""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    self._dns_server = '10.10.10.4'
    global LOGGER
    LOGGER = self._get_logger()

  def _check_dns_traffic(self, tcpdump_filter):
    to_dns = self._exec_tcpdump(tcpdump_filter)
    num_query_dns = len(to_dns)
    LOGGER.info('DNS queries found: ' + str(num_query_dns))
    dns_traffic_detected = len(to_dns) > 0
    LOGGER.info('DNS traffic detected: ' + str(dns_traffic_detected))
    return dns_traffic_detected

  def _dns_network_from_dhcp(self):
    LOGGER.info("Running dns.network.from_dhcp")
    LOGGER.info('Checking DNS traffic for configured DHCP DNS server: ' +
                self._dns_server)

    # Check if the device DNS traffic is to appropriate server
    tcpdump_filter = (f'dst port 53 and dst host {self._dns_server}',
                      f' and ether src {self._device_mac}')

    result = self._check_dns_traffic(tcpdump_filter=tcpdump_filter)

    LOGGER.info('DNS traffic detected to configured DHCP DNS server: ' +
                str(result))
    return result

  def _dns_network_from_device(self):
    LOGGER.info("Running dns.network.from_device")
    LOGGER.info('Checking DNS traffic from device: ' + self._device_mac)

    # Check if the device DNS traffic is to appropriate server
    tcpdump_filter = f'dst port 53 and ether src {self._device_mac}'

    result = self._check_dns_traffic(tcpdump_filter=tcpdump_filter)

    LOGGER.info('DNS traffic detected from device: ' + str(result))
    return result

  def _dns_mdns(self):
    LOGGER.info("Running dns.mdns")

    # Check if the device sends any MDNS traffic
    tcpdump_filter = f'udp port 5353 and ether src {self._device_mac}'
    
    result = self._check_dns_traffic(tcpdump_filter=tcpdump_filter)

    LOGGER.info('MDNS traffic detected from device: ' + str(result))
    return not result


  def _exec_tcpdump(self, tcpdump_filter):
    """
    Args
        tcpdump_filter: Filter to pass onto tcpdump file
        capture_file: Optional capture file to look
    Returns
        List of packets matching the filter
    """
    command = f'tcpdump -tttt -n -r {CAPTURE_FILE} {tcpdump_filter}'

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
