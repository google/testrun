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
from scapy.all import rdpcap, DNS, IP, Ether
from test_module import TestModule
import os
from collections import Counter

LOG_NAME = 'test_dns'
MODULE_REPORT_FILE_NAME = 'dns_report.html'
DNS_SERVER_CAPTURE_FILE = '/runtime/network/dns.pcap'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
LOGGER = None


class DNSModule(TestModule):
  """DNS Test module"""

  def __init__(self,
               module,
               log_dir=None,
               conf_file=None,
               results_dir=None,
               dns_server_capture_file=DNS_SERVER_CAPTURE_FILE,
               startup_capture_file=STARTUP_CAPTURE_FILE,
               monitor_capture_file=MONITOR_CAPTURE_FILE):
    super().__init__(module_name=module,
                     log_name=LOG_NAME,
                     log_dir=log_dir,
                     conf_file=conf_file,
                     results_dir=results_dir)
    self.dns_server_capture_file = dns_server_capture_file
    self.startup_capture_file = startup_capture_file
    self.monitor_capture_file = monitor_capture_file
    self._dns_server = '10.10.10.4'
    global LOGGER
    LOGGER = self._get_logger()

  def generate_module_report(self):
    # Extract DNS data from the pcap file
    dns_table_data = self.extract_dns_data()

    html_content = '<h1>DNS Module</h1>'

    # Set the summary variables
    local_requests = sum(
        1 for row in dns_table_data
        if row['Destination'] == self._dns_server and row['Type'] == 'Query')
    external_requests = sum(
        1 for row in dns_table_data
        if row['Destination'] != self._dns_server and row['Type'] == 'Query')

    total_requests = sum(1 for row in dns_table_data if row['Type'] == 'Query')

    total_responses = sum(1 for row in dns_table_data
                          if row['Type'] == 'Response')

    # Add summary table
    html_content += (f'''
      <table class="module-summary">
        <thead>
          <tr>
            <th>Requests to local DNS server</th>
            <th>Requests to external DNS servers</th>
            <th>Total DNS requests</th>
            <th>Total DNS responses</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{local_requests}</td>
            <td>{external_requests}</td>
            <td>{total_requests}</td>
            <td>{total_responses}</td>   
          </tr>
      </table>
                     ''')

    if (total_requests + total_responses) > 0:

      table_content = '''
        <table class="module-data">
          <thead>
            <tr>
              <th>Source</th>
              <th>Destination</th>
              <th>Type</th>
              <th>URL</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>'''

      # Count unique combinations
      counter = Counter(
          (row['Source'], row['Destination'], row['Type'], row['Data'])
          for row in dns_table_data)

      # Generate the HTML table with the count column
      for (src, dst, typ, dat), count in counter.items():
        table_content += f'''
              <tr>
                <td>{src}</td>
                <td>{dst}</td>
                <td>{typ}</td>
                <td>{dat}</td>
                <td>{count}</td>
              </tr>'''

      table_content += '''
            </tbody>
          </table>
                       '''

      html_content += table_content

    else:
      html_content += ('''
        <div class="callout-container info">
          <div class="icon"></div>
          No DNS traffic detected from the device
        </div>''')

    LOGGER.debug('Module report:\n' + html_content)

    # Use os.path.join to create the complete file path
    report_path = os.path.join(self._results_dir, MODULE_REPORT_FILE_NAME)

    # Write the content to a file
    with open(report_path, 'w', encoding='utf-8') as file:
      file.write(html_content)

    LOGGER.info('Module report generated at: ' + str(report_path))

    return report_path

  def extract_dns_data(self):
    dns_data = []

    # Read the pcap file
    packets = rdpcap(self.dns_server_capture_file) + rdpcap(
        self.startup_capture_file) + rdpcap(self.monitor_capture_file)

    # Iterate through DNS packets
    for packet in packets:
      if DNS in packet and packet.haslayer(IP):

        # Check if either source or destination MAC matches the device
        if self._device_mac in (packet[Ether].src, packet[Ether].dst):
          source_ip = packet[IP].src
          destination_ip = packet[IP].dst
          dns_layer = packet[DNS]
          # 'qr' field indicates query (0) or response (1)
          dns_type = 'Query' if dns_layer.qr == 0 else 'Response'

          # Check for the presence of DNS query name
          if hasattr(dns_layer, 'qd') and dns_layer.qd is not None:
            qname = dns_layer.qd.qname.decode() if dns_layer.qd.qname else 'N/A'
          else:
            qname = 'N/A'

          dns_data.append({
              'Timestamp': float(packet.time),  # Timestamp of the DNS packet
              'Source': source_ip,
              'Destination': destination_ip,
              'Type': dns_type,
              'Data': qname[:-1]
          })

    # Filter unique entries based on 'Timestamp'
    # DNS Server will duplicate messages caught by
    # startup and monitor
    filtered_unique_dns_data = []
    seen_timestamps = set()

    for entry in dns_data:
      timestamp = entry.get('Timestamp')
      if timestamp not in seen_timestamps:
        seen_timestamps.add(timestamp)
        filtered_unique_dns_data.append(entry)

    return filtered_unique_dns_data

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
    LOGGER.info('Checking DNS traffic for configured DHCP DNS server: ' +
                self._dns_server)

    # Check if the device DNS traffic is to appropriate local
    # DHCP provided server
    tcpdump_filter = (f'dst port 53 and dst host {self._dns_server} ' +
                      f'and ether src {self._device_mac}')
    dns_packets_local = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)

    # Check if the device sends any DNS traffic to non-DHCP provided server
    tcpdump_filter = (f'dst port 53 and dst not host {self._dns_server} ' +
                      'ether src {self._device_mac}')
    dns_packets_not_local = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)

    if dns_packets_local or dns_packets_not_local:
      if dns_packets_not_local:
        description = 'DNS traffic detected to non-DHCP provided server'
      else:
        LOGGER.info('DNS traffic detected only to configured DHCP DNS server')
        description = 'DNS traffic detected only to DHCP provided server'
    else:
      LOGGER.info('No DNS traffic detected from the device')
      description = 'No DNS traffic detected from the device'
    return 'Informational', description

  def _dns_network_hostname_resolution(self):
    LOGGER.info('Running dns.network.hostname_resolution')
    LOGGER.info('Checking DNS traffic from device: ' + self._device_mac)

    # Check if the device DNS traffic
    tcpdump_filter = f'dst port 53 and ether src {self._device_mac}'
    dns_packets = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)

    if dns_packets:
      LOGGER.info('DNS traffic detected from device')
      result = True, 'DNS traffic detected from device'
    else:
      LOGGER.info('No DNS traffic detected from the device')
      result = False, 'No DNS traffic detected from the device'
    return result

  def _dns_mdns(self):
    LOGGER.info('Running dns.mdns')
    # Check if the device sends any MDNS traffic
    tcpdump_filter = f'udp port 5353 and ether src {self._device_mac}'
    dns_packets = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)

    if dns_packets:
      LOGGER.info('MDNS traffic detected from device')
      result = 'Informational', 'MDNS traffic detected from device'
    else:
      LOGGER.info('No MDNS traffic detected from the device')
      result = 'Informational', 'No MDNS traffic detected from the device'
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

    with subprocess.Popen(command,
                          universal_newlines=True,
                          shell=True,
                          stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE) as process:
      text = str(process.stdout.read()).rstrip()

      LOGGER.debug('tcpdump response: ' + text)

      if text:
        return text.split('\n')

    return []
