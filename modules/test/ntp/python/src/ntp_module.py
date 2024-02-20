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
from scapy.all import rdpcap, IP, IPv6, NTP, UDP, Ether
from datetime import datetime
import os

LOG_NAME = 'test_ntp'
MODULE_REPORT_FILE_NAME = 'ntp_report.md'
NTP_SERVER_CAPTURE_FILE = '/runtime/network/ntp.pcap'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
LOGGER = None


class NTPModule(TestModule):
  """NTP Test module"""

  def __init__(self,
               module,
               log_dir=None,
               conf_file=None,
               results_dir=None,
               ntp_server_capture_file=NTP_SERVER_CAPTURE_FILE,
               startup_capture_file=STARTUP_CAPTURE_FILE,
               monitor_capture_file=MONITOR_CAPTURE_FILE):
    super().__init__(module_name=module,
                     log_name=LOG_NAME,
                     log_dir=log_dir,
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
    # Extract NTP data from the pcap file
    ntp_table_data = self.extract_ntp_data()

    table_content = ''
    for row in ntp_table_data:
      # Timestamp of the NTP packet
      dt_object = datetime.utcfromtimestamp(row['Timestamp'])

      # Extract milliseconds from the fractional part of the timestamp
      milliseconds = int((row['Timestamp'] % 1) * 1000)

      # Format the datetime object with milliseconds
      formatted_time = dt_object.strftime(
          '%b %d, %Y %H:%M:%S.') + f'{milliseconds:03d}'

      table_content += (f'''| {row['Source']: ^17} '''
                        f'''| {row['Destination']: ^17} '''
                        f'''| {row['Type']: ^8} '''
                        f'''| {row['Version']: ^9} '''
                        f'''| {formatted_time: ^{27}} |\n''')

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

    summary = '## Summary'
    summary += f'''\n- Requests to local NTP servers: {local_requests}'''
    summary += f'''\n- Requests to external NTP servers: {external_requests}'''
    summary += f'''\n- Total NTP requests: {total_requests}'''
    summary += f'''\n- Total NTP responses: {total_responses}'''

    if total_requests + total_responses > 0:

      header = (f'''| {'Source': ^17} '''
                f'''| {'Destination': ^17} '''
                f'''| {'Type': ^8} '''
                f'''| {'Version': ^9} '''
                f'''| {'Timestamp': ^27} |''')
      header_line = (f'''|{'-' * 19}|{'-' * 19}|{'-' * 10}'''
                     f'''|{'-' * 11}'''
                     f'''|{'-' * 29}|''')

      markdown_template = (
          f'''# NTP Module\n'''
          f'''\n{header}\n{header_line}\n{table_content}\n{summary}''')

    else:
      markdown_template = (f'''# NTP Module\n'''
                           f'''\n- No NTP traffic detected\n'''
                           f'''\n{summary}''')

    LOGGER.debug('Markdown Report:\n' + markdown_template)

    # Use os.path.join to create the complete file path
    report_path = os.path.join(self._results_dir, MODULE_REPORT_FILE_NAME)

    # Write the content to a file
    with open(report_path, 'w', encoding='utf-8') as file:
      file.write(markdown_template)

    LOGGER.info('Module report generated at: ' + str(report_path))

    return report_path

  def extract_ntp_data(self):
    ntp_data = []

    # Read the pcap file
    packets = rdpcap(self.ntp_server_capture_file) + rdpcap(
        self.startup_capture_file) + rdpcap(self.monitor_capture_file)

    # Iterate through NTP packets
    for packet in packets:
      if packet.haslayer(UDP) and packet.haslayer(NTP) and packet.haslayer(IP):
        source_mac = packet[Ether].src
        destination_mac = packet[Ether].dst

        # Local NTP server syncs to external servers so we need to filter only
        # for traffic to/from the device
        if self._device_mac in (source_mac, destination_mac):
          if IP in packet:
            source_ip = packet[IP].src
            dest_ip = packet[IP].dst
          elif IPv6 in packet:
            source_ip = packet[IPv6].src
            dest_ip = packet[IPv6].dst

          # 'Mode' field indicates client (3) or server (4)
          ntp_mode = 'Client' if packet[NTP].mode == 3 else 'Server'

          # 'VN' field indicates NTP version
          ntp_version = packet[NTP].version

          ntp_data.append({
              'Source': source_ip,
              'Destination': dest_ip,
              'Type': ntp_mode,
              'Version': str(ntp_version),
              'Timestamp': float(packet.time),
          })

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
    result = None
    packet_capture = (rdpcap(STARTUP_CAPTURE_FILE) +
                      rdpcap(MONITOR_CAPTURE_FILE) +
                      rdpcap(NTP_SERVER_CAPTURE_FILE))

    device_sends_ntp4 = False
    device_sends_ntp3 = False

    for packet in packet_capture:

      if NTP in packet and packet.src == self._device_mac:
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

    if not (device_sends_ntp3 or device_sends_ntp4):
      result = False, 'Device has not sent any NTP requests'
    elif device_sends_ntp3 and device_sends_ntp4:
      result = False, ('Device sent NTPv3 and NTPv4 packets. ' +
                       'NTPv3 is not allowed.')
    elif device_sends_ntp3:
      result = False, ('Device sent NTPv3 packets. '
                       'NTPv3 is not allowed.')
    elif device_sends_ntp4:
      result = True, 'Device sent NTPv4 packets.'
    LOGGER.info(result[1])
    return result

  def _ntp_network_ntp_dhcp(self):
    LOGGER.info('Running ntp.network.ntp_dhcp')
    result = None
    packet_capture = (rdpcap(STARTUP_CAPTURE_FILE) +
                      rdpcap(MONITOR_CAPTURE_FILE) +
                      rdpcap(NTP_SERVER_CAPTURE_FILE))

    device_sends_ntp = False
    ntp_to_local = False
    ntp_to_remote = False

    for packet in packet_capture:
      if NTP in packet and packet.src == self._device_mac:
        device_sends_ntp = True
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

    if device_sends_ntp:
      if ntp_to_local and ntp_to_remote:
        result = False, ('Device sent NTP request to DHCP provided ' +
                         'server and non-DHCP provided server')
      elif ntp_to_remote:
        result = False, 'Device sent NTP request to non-DHCP provided server'
      elif ntp_to_local:
        result = True, 'Device sent NTP request to DHCP provided server'
    else:
      result = False, 'Device has not sent any NTP requests'

    LOGGER.info(result[1])
    return result
