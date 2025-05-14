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
"""NTP test module"""
from test_module import TestModule
from scapy.all import rdpcap, IP, IPv6, NTP
from scapy.error import Scapy_Exception
import os
from collections import defaultdict
from jinja2 import Environment, FileSystemLoader
import pyshark

LOG_NAME = 'test_ntp'
MODULE_REPORT_FILE_NAME = 'ntp_report.j2.html'
NTP_SERVER_CAPTURE_FILE = '/runtime/network/ntp.pcap'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
LOGGER = None
REPORT_TEMPLATE_FILE = 'report_template.jinja2'


class NTPModule(TestModule):
  """NTP Test module"""

  def __init__(
      self,  # pylint: disable=R0917
      module,
      conf_file=None,
      results_dir=None,
      ntp_server_capture_file=NTP_SERVER_CAPTURE_FILE,
      startup_capture_file=STARTUP_CAPTURE_FILE,
      monitor_capture_file=MONITOR_CAPTURE_FILE):
    super().__init__(module_name=module,
                     log_name=LOG_NAME,
                     conf_file=conf_file,
                     results_dir=results_dir)
    self.ntp_server_capture_file = ntp_server_capture_file
    self.startup_capture_file = startup_capture_file
    self.monitor_capture_file = monitor_capture_file
    # TODO: This should be fetched dynamically
    self._ntp_server = '10.10.10.5'

    global LOGGER
    LOGGER = self._get_logger()

  def generate_module_report(self):
    # Load Jinja2 template
    page_max_height = 910
    header_height = 48
    summary_height = 135
    row_height = 42
    loader = FileSystemLoader(self._report_template_folder)
    template = Environment(
        loader=loader,
        trim_blocks=True,
        lstrip_blocks=True,
    ).get_template(REPORT_TEMPLATE_FILE)
    module_header = 'NTP Module'
    # Summary table headers
    summary_headers = [
        'Requests to local NTP server', 'Requests to external NTP servers',
        'Total NTP requests', 'Total NTP responses'
    ]
    # Module data Headers
    module_data_headers = [
        'Source',
        'Destination',
        'Type',
        'Version',
        'Count',
        'Sync Request Average',
    ]

    # List of capture files to scan
    pcap_files = [
        self.startup_capture_file, self.monitor_capture_file,
        self.ntp_server_capture_file
    ]
    # Extract NTP data from the pcap file
    ntp_table_data = self.extract_ntp_data(pcap_files)

    # Set the summary variables
    local_requests = sum(
        1 for row in ntp_table_data
        if row['Destination'] == self._ntp_server and row['Type'] == 'Client')
    external_requests = sum(
        1 for row in ntp_table_data
        if row['Destination'] != self._ntp_server and row['Type'] == 'Client')

    total_requests = sum(1 for row in ntp_table_data if row['Type'] == 'Client')

    total_responses = sum(1 for row in ntp_table_data
                          if row['Type'] == 'Server')

    # Summary table data
    summary_data = [
        local_requests, external_requests, total_requests, total_responses
    ]

    # Initialize a dictionary to store timestamps for each unique combination
    timestamps = defaultdict(list)

    # Collect timestamps for each unique combination
    for row in ntp_table_data:
      # Add the timestamp to the corresponding combination
      key = (row['Source'], row['Destination'], row['Type'], row['Version'])
      timestamps[key].append(row['Timestamp'])

    # Calculate the average time between requests for each unique combination
    average_time_between_requests = {}

    for key, times in timestamps.items():
      # Sort the timestamps
      times.sort()

      # Calculate the time differences between consecutive timestamps
      time_diffs = [t2 - t1 for t1, t2 in zip(times[:-1], times[1:])]

      # Calculate the average of the time differences
      if time_diffs:
        avg_diff = sum(time_diffs) / len(time_diffs)
      else:
        avg_diff = 0  # one timestamp, the average difference is 0

      average_time_between_requests[key] = avg_diff

    # Module table data
    module_table_data = []
    if total_requests + total_responses > 0:

      # Generate the HTML table with the count column
      for (src, dst, typ,
           version), avg_diff in average_time_between_requests.items():
        cnt = len(timestamps[(src, dst, typ, version)])

        # Sync Average only applies to client requests
        if 'Client' in typ:
          # Convert avg_diff to seconds and format it
          avg_diff_seconds = avg_diff
          avg_formatted_time = f'{avg_diff_seconds:.3f} seconds'
        else:
          avg_formatted_time = 'N/A'

        module_table_data.append({
            'src': src,
            'dst': dst,
            'typ': typ,
            'version': version,
            'cnt': cnt,
            'avg_fmt': avg_formatted_time
        })

    # Handling the possible table split
    table_height = (len(module_table_data) + 1) * row_height
    page_useful_space = page_max_height - header_height - summary_height
    pages = table_height // (page_useful_space)
    rows_on_page = ((page_useful_space) // row_height) - 1
    start = 0
    report_html = ''
    for page in range(pages + 1):
      end = start + min(len(module_table_data), rows_on_page)
      module_header_repr = module_header if page == 0 else None
      page_html = template.render(base_template=self._base_template_file,
                                  module_header=module_header_repr,
                                  summary_headers=summary_headers,
                                  summary_data=summary_data,
                                  module_data_headers=module_data_headers,
                                  module_data=module_table_data[start:end])
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

  def extract_ntp_data(self, pcap_files):
    all_packets = []
    for pcap_file in pcap_files:
      packets = pyshark.FileCapture(pcap_file,
                                    display_filter='ntp and not icmp')
      try:
        for packet in packets:
          all_packets.append(packet)
      finally:
        packets.close()

    ntp_data = []
    for packet in all_packets:
      try:
        if not hasattr(packet, 'eth') or not (hasattr(packet, 'ip')
                                              or hasattr(packet, 'ipv6')):
          continue

        source_mac = getattr(packet.eth, 'src', None)
        destination_mac = getattr(packet.eth, 'dst', None)

        if self._device_mac not in (source_mac, destination_mac):
          continue

        if hasattr(packet, 'ip'):
          source_ip = packet.ip.src
          dest_ip = packet.ip.dst
        else:
          source_ip = packet.ipv6.src
          dest_ip = packet.ipv6.dst

        ntp_mode_value = int(packet.ntp.flags_mode)
        ntp_mode = 'Client' if ntp_mode_value == 3 else 'Server'
        ntp_version = packet.ntp.flags_vn

        ntp_data.append({
            'Source': source_ip,
            'Destination': dest_ip,
            'Type': ntp_mode,
            'Version': str(ntp_version),
            'Timestamp': float(packet.sniff_time.timestamp()),
        })

      except Exception as e:  # pylint: disable=W0718
        LOGGER.exception(f'Unexpected error while parsing packet: {e}')
        continue

    # Filter unique entries based on 'Timestamp'
    # NTP Server will duplicate messages caught by
    # startup and monitor
    filtered_unique_ntp_data = []
    seen_timestamps = set()

    for entry in ntp_data:
      timestamp = entry.get('Timestamp')
      if timestamp not in seen_timestamps:
        seen_timestamps.add(timestamp)
        filtered_unique_ntp_data.append(entry)

    return filtered_unique_ntp_data

  def _ntp_network_ntp_support(self):
    LOGGER.info('Running ntp.network.ntp_support')

    # Read the pcap files
    packet_capture = (rdpcap(self.startup_capture_file) +
                      rdpcap(self.monitor_capture_file))

    try:
      packet_capture += rdpcap(self.ntp_server_capture_file)
    except (FileNotFoundError, Scapy_Exception):
      LOGGER.error('ntp.pcap not found or empty, ignoring')

    device_sends_ntp4 = False
    device_sends_ntp3 = False

    for packet in packet_capture:

      if NTP in packet and packet.src == self._device_mac:

        dest_ip = None

        if IP in packet:
          dest_ip = packet[IP].dst
        elif IPv6 in packet:
          dest_ip = packet[IPv6].dst
        if packet[NTP].version == 4:
          device_sends_ntp4 = True
          LOGGER.info(f'Device sent NTPv4 request to {dest_ip}')
        elif packet[NTP].version == 3:
          device_sends_ntp3 = True
          LOGGER.info(f'Device sent NTPv3 request to {dest_ip}')

    result = False, 'Device has not sent any NTP requests'

    if device_sends_ntp3 and device_sends_ntp4:
      result = True, ('Device sent NTPv3 and NTPv4 packets')
    elif device_sends_ntp3:
      result = False, ('Device sent NTPv3 packets')
    elif device_sends_ntp4:
      result = True, 'Device sent NTPv4 packets'

    LOGGER.info(result[1])
    return result

  def _ntp_network_ntp_dhcp(self):
    LOGGER.info('Running ntp.network.ntp_dhcp')

    # Read the pcap files
    packet_capture = (rdpcap(self.startup_capture_file) +
                      rdpcap(self.monitor_capture_file))

    try:
      packet_capture += rdpcap(self.ntp_server_capture_file)
    except (FileNotFoundError, Scapy_Exception):
      LOGGER.error('ntp.pcap not found or empty, ignoring')

    device_sends_ntp = False
    ntp_to_local = False
    ntp_to_remote = False

    for packet in packet_capture:
      if NTP in packet and packet.src == self._device_mac:
        device_sends_ntp = True
        dest_ip = None
        if IP in packet:
          dest_ip = packet[IP].dst
        elif IPv6 in packet:
          dest_ip = packet[IPv6].dst
        if dest_ip == self._ntp_server:
          LOGGER.info('Device sent NTP request to DHCP provided NTP server')
          ntp_to_local = True
        else:
          LOGGER.info('Device sent NTP request to non-DHCP provided NTP server')
          ntp_to_remote = True

    result = 'Feature Not Detected', 'Device has not sent any NTP requests'

    if device_sends_ntp:
      if ntp_to_local and ntp_to_remote:
        result = False, ('Device sent NTP request to DHCP provided ' +
                         'server and non-DHCP provided server')
      elif ntp_to_remote:
        result = ('Feature Not Detected',
                  'Device sent NTP request to non-DHCP provided server')
      elif ntp_to_local:
        result = True, 'Device sent NTP request to DHCP provided server'

    LOGGER.info(result[1])
    return result
