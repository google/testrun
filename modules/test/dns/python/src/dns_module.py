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
from scapy.all import rdpcap, DNS, IP, Ether, DNSRR
from scapy.error import Scapy_Exception
from test_module import TestModule
import os
from collections import Counter
from jinja2 import Environment, FileSystemLoader

LOG_NAME = 'test_dns'
MODULE_REPORT_FILE_NAME = 'dns_report.j2.html'
DNS_SERVER_CAPTURE_FILE = '/runtime/network/dns.pcap'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
LOGGER = None
REPORT_TEMPLATE_FILE = 'report_template.jinja2'


class DNSModule(TestModule):
  """DNS Test module"""

  def __init__(self, # pylint: disable=R0917
               module,
               conf_file=None,
               results_dir=None,
               dns_server_capture_file=DNS_SERVER_CAPTURE_FILE,
               startup_capture_file=STARTUP_CAPTURE_FILE,
               monitor_capture_file=MONITOR_CAPTURE_FILE):
    super().__init__(module_name=module,
                     log_name=LOG_NAME,
                     conf_file=conf_file,
                     results_dir=results_dir)
    self.dns_server_capture_file = dns_server_capture_file
    self.startup_capture_file = startup_capture_file
    self.monitor_capture_file = monitor_capture_file
    self._dns_server = '10.10.10.4'
    global LOGGER
    LOGGER = self._get_logger()

  def generate_module_report(self):
    # Load Jinja2 template
    page_max_height = 850
    header_height = 48
    summary_height = 135
    row_height = 44
    loader=FileSystemLoader(self._report_template_folder)
    template = Environment(
                            loader=loader,
                            trim_blocks=True,
                            lstrip_blocks=True
                            ).get_template(REPORT_TEMPLATE_FILE)
    module_header='DNS Module'
    # Summary table headers
    summary_headers = [
                        'Requests to local DNS server',
                        'Requests to external DNS servers',
                        'Total DNS requests',
                        'Total DNS responses',
                        ]
    # Module data Headers
    module_data_headers = [
                            'Source',
                            'Destination',
                            'Resolved IP', 
                            'Type',
                            'URL',
                            'Count',
                          ]
    # Extract DNS data from the pcap file
    dns_table_data = self.extract_dns_data()

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
    summary_data = [
                    local_requests,
                    external_requests,
                    total_requests,
                    total_responses,
                    ]

    module_data = []
    if (total_requests + total_responses) > 0:

      # Count unique combinations
      counter = Counter((row['Source'], row['Destination'], row['ResolvedIP'],
                         row['Type'], row['Data']) for row in dns_table_data)

      # Generate the HTML table with the count column
      for (src, dst, res_ip, typ, dat), count in counter.items():
        module_data.append({
                            'src': src,
                            'dst': dst,
                            'res_ip': res_ip,
                            'typ': typ,
                            'dat': dat,
                            'count': count,
                            })
    # Handling the possible table split
    table_height = (len(module_data) + 1) * row_height
    page_useful_space = page_max_height - header_height - summary_height
    pages = table_height // (page_useful_space)
    rows_on_page = (page_useful_space) // row_height
    start = 0
    report_html = ''
    for page in range(pages+1):
      end = start + min(len(module_data), rows_on_page)
      module_header_repr = module_header if page == 0 else None
      page_html = template.render(
                                base_template=self._base_template_file,
                                module_header=module_header_repr,
                                summary_headers=summary_headers,
                                summary_data=summary_data,
                                module_data_headers=module_data_headers,
                                module_data=module_data[start:end]
                              )
      report_html += page_html
      start = end

    LOGGER.debug('Module report:\n' + report_html)

    # Use os.path.join to create the complete file path
    report_path = os.path.join(self._results_dir, MODULE_REPORT_FILE_NAME)

    # Write the content to a file
    with open(report_path, 'w', encoding='utf-8') as file:
      file.write(report_html)

    LOGGER.info('Module report generated at: ' + str(report_path))

    return report_path

  def extract_dns_data(self):
    dns_data = []

    # Read the startup and monitor pcap files
    packets = (rdpcap(self.startup_capture_file) +
               rdpcap(self.monitor_capture_file))

    # Read the dns.pcap file
    try:
      packets += rdpcap(self.dns_server_capture_file)
    except (FileNotFoundError, Scapy_Exception):
      LOGGER.error('dns.pcap not found or empty, ignoring')

    # Iterate through DNS packets
    for packet in packets:
      if DNS in packet and packet.haslayer(IP):

        # Check if either source or destination MAC matches the device
        if self._device_mac in [packet[Ether].src, packet[Ether].dst]:
          source_ip = packet[IP].src
          destination_ip = packet[IP].dst
          dns_layer = packet[DNS]
          # 'qr' field indicates query (0) or response (1)
          dns_type = 'Query' if dns_layer.qr == 0 else 'Response'

          # Check if 'qd' (query data) exists and has at least one entry
          if hasattr(dns_layer, 'qd') and dns_layer.qdcount > 0:
            qname = dns_layer.qd.qname.decode() if dns_layer.qd.qname else 'N/A'
          else:
            qname = 'N/A'

          resolved_ip = 'N/A'
          # If it's a response packet, extract the resolved IP address
          # from the answer section
          if dns_layer.qr == 1 and hasattr(dns_layer,
                                           'an') and dns_layer.ancount > 0:
            # Loop through all answers in the DNS response
            for i in range(min(dns_layer.ancount, len(dns_layer.an))):
              answer = dns_layer.an[i]
              # Check if the answer is of type DNSRR
              if isinstance(answer, DNSRR):
                # Check for IPv4 (A record) or IPv6 (AAAA record)
                if answer.type == 1:  # Indicates an A record (IPv4 address)
                  resolved_ip = answer.rdata  # Extract IPv4 address
                  break  # Stop after finding the first valid resolved IP
                elif answer.type == 28: # Indicates AAAA record (IPv6 address)
                  resolved_ip = answer.rdata  # Extract IPv6 address
                  break  # Stop after finding the first valid resolved IP

          dns_data.append({
              'Timestamp': float(packet.time),  # Timestamp of the DNS packet
              'Source': source_ip,
              'Destination': destination_ip,
              'ResolvedIP': resolved_ip,  # Adding the resolved IP address
              'Type': dns_type,
              'Data': qname[:-1]
          })

    # Filter unique entries based on 'Timestamp'
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
                                            self.dns_server_capture_file)
    LOGGER.info('DNS Server queries found: ' + str(len(dns_server_queries)))

    dns_startup_queries = self._exec_tcpdump(tcpdump_filter,
                                             self.startup_capture_file)
    LOGGER.info('Startup DNS queries found: ' + str(len(dns_startup_queries)))

    dns_monitor_queries = self._exec_tcpdump(tcpdump_filter,
                                             self.monitor_capture_file)
    LOGGER.info('Monitor DNS queries found: ' + str(len(dns_monitor_queries)))

    num_query_dns = len(dns_server_queries) + len(dns_startup_queries) + len(
        dns_monitor_queries)
    LOGGER.info('DNS queries found: ' + str(num_query_dns))

    return num_query_dns > 0

  # Added to access the method for dns unittests
  def dns_network_from_dhcp(self):
    return self._dns_network_from_dhcp()

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
    tcpdump_filter = (f'dst port 53 and not dst host {self._dns_server} ' +
                      f'and ether src {self._device_mac}')
    dns_packets_not_local = self._has_dns_traffic(tcpdump_filter=tcpdump_filter)
    if dns_packets_local or dns_packets_not_local:
      if dns_packets_not_local:
        description = 'DNS traffic detected to non-DHCP provided server'
      else:
        LOGGER.info('DNS traffic detected only to configured DHCP DNS server')
        description = 'DNS traffic detected only to DHCP provided server'
    else:
      LOGGER.info(
        'No DNS traffic detected from the device to the DHCP DNS server')
      description = '' \
      'No DNS traffic detected from the device to the DHCP DNS server'
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
