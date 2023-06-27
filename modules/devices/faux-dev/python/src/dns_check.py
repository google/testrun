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

"""Used to check if the DNS server is functioning as expected"""

import logger
import time
import util
import subprocess

LOGGER = None
LOG_NAME = 'dns_validator'
HOST_PING = 'google.com'
CAPTURE_FILE = '/runtime/network/faux-dev.pcap'
DNS_CONFIG_FILE = '/etc/resolv.conf'


class DNSValidator:
  """Validates all expected test behaviors around the DNS server"""

  def __init__(self, module):
    self._dns_server = None
    self.dns_resolution_test = False
    self.dns_dhcp_server_test = False
    self.add_logger(module)

  def add_logger(self, module):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, module)

  def print_test_results(self):
    self.print_test_result('DNS resolution test', self.dns_resolution_test)
    self.print_test_result('DNS DHCP server test', self.dns_dhcp_server_test)

  def print_test_result(self, test_name, result):
    LOGGER.info(test_name + ': Pass' if result else test_name + ': Fail')

  def validate(self, dhcp_lease):
    self._dns_server = dhcp_lease.dns_server
    self._set_dns_server()
    self._check_dns_traffic()

  def _check_dns_traffic(self):
    LOGGER.info('Checking DNS traffic for DNS server: ' + self._dns_server)

    # Ping a host to generate DNS traffic
    if self._ping(HOST_PING)[0]:
      LOGGER.info('Ping success')
      self.dns_resolution_test = True
    else:
      LOGGER.info('Ping failed')

    # Some delay between pings and DNS traffic in the capture file
    # so give some delay before we try to query again
    time.sleep(5)

    # Check if the device has sent any DNS requests
    filter_to_dns = f'dst port 53 and dst host {self._dns_server}'
    to_dns = self._exec_tcpdump(filter_to_dns)
    num_query_dns = len(to_dns)
    LOGGER.info('DNS queries found: ' + str(num_query_dns))
    dns_traffic_detected = len(to_dns) > 0
    if dns_traffic_detected:
      LOGGER.info('DNS traffic detected to configured DHCP DNS server')
      self.dns_dhcp_server_test = True
    else:
      LOGGER.error('No DNS traffic detected')

  # Docker containeres resolve DNS servers from the host
  # and do not play nice with normal networking methods
  # so we need to set our DNS servers manually
  def _set_dns_server(self):
    with open(DNS_CONFIG_FILE, 'w', encoding='utf-8') as f:
      f.write('nameserver ' + self._dns_server)

  # Generate DNS traffic by doing a simple ping by hostname
  def _ping(self, host):
    cmd = 'ping -c 5 ' + host
    success = util.run_command(cmd, LOGGER)
    return success

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
