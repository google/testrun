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
import os
from collections import defaultdict

LOG_NAME = 'test_ntp'
MODULE_REPORT_FILE_NAME = 'ntp_report.html'
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

    html_content = '<h4 class="page-heading">NTP Module</h4>'

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

    # Add summary table
    html_content += (f'''
      <table class="module-summary">
        <thead>
          <tr>
            <th>Requests to local NTP server</th>
            <th>Requests to external NTP servers</th>
            <th>Total NTP requests</th>
            <th>Total NTP responses</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{local_requests}</td>
            <td>{external_requests}</td>
            <td>{total_requests}</td>
            <td>{total_responses}</td>   
          </tr>
        </tbody>
      </table>
      ''')

    if total_requests + total_responses > 0:
      table_content = '''
        <table class="module-data">
          <thead>
            <tr>
              <th>Source</th>
              <th>Destination</th>
              <th>Type</th>
              <th>Version</th>
              <th>Count</th>
              <th>Sync Request Average</th>
            </tr>
          </thead>
          <tbody>'''

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

        table_content += f'''
            <tr>
              <td>{src}</td>
              <td>{dst}</td>
              <td>{typ}</td>
              <td>{version}</td>
              <td>{cnt}</td>
              <td>{avg_formatted_time}</td>
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
          No NTP traffic detected from the device
        </div>''')

    LOGGER.debug('Module report:\n' + html_content)

    # Use os.path.join to create the complete file path
    report_path = os.path.join(self._results_dir, MODULE_REPORT_FILE_NAME)

    # Write the content to a file
    with open(report_path, 'w', encoding='utf-8') as file:
      file.write(html_content)

    LOGGER.info('Module report generated at: ' + str(report_path))

    return report_path

  def extract_ntp_data(self):
    ntp_data = []

    # Read the pcap files
    packets = (rdpcap(self.startup_capture_file) +
               rdpcap(self.monitor_capture_file) +
               rdpcap(self.ntp_server_capture_file))

    # Iterate through NTP packets
    for packet in packets:
      if packet.haslayer(UDP) and packet.haslayer(NTP) and packet.haslayer(IP):
        source_mac = packet[Ether].src
        destination_mac = packet[Ether].dst

        # Local NTP server syncs to external servers so we need to filter only
        # for traffic to/from the device
        if self._device_mac in (source_mac, destination_mac):

          source_ip = None
          dest_ip = None

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
    packet_capture = (rdpcap(STARTUP_CAPTURE_FILE) +
                      rdpcap(MONITOR_CAPTURE_FILE) +
                      rdpcap(NTP_SERVER_CAPTURE_FILE))

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
      result = False, ('Device sent NTPv3 and NTPv4 packets')
    elif device_sends_ntp3:
      result = False, ('Device sent NTPv3 packets')
    elif device_sends_ntp4:
      result = True, 'Device sent NTPv4 packets'

    LOGGER.info(result[1])
    return result

  def _ntp_network_ntp_dhcp(self):
    LOGGER.info('Running ntp.network.ntp_dhcp')
    packet_capture = (rdpcap(STARTUP_CAPTURE_FILE) +
                      rdpcap(MONITOR_CAPTURE_FILE) +
                      rdpcap(NTP_SERVER_CAPTURE_FILE))

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
