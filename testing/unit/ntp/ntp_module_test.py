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
"""Module run all the DNS related unit tests"""
from ntp_module import NTPModule
import unittest
from scapy.all import rdpcap, NTP, wrpcap
import os
from testreport import TestReport

MODULE = 'ntp'

# Define the file paths
TEST_FILES_DIR = 'testing/unit/' + MODULE
OUTPUT_DIR = os.path.join(TEST_FILES_DIR,'output/')
REPORTS_DIR = os.path.join(TEST_FILES_DIR,'reports/')
CAPTURES_DIR = os.path.join(TEST_FILES_DIR,'captures/')

LOCAL_REPORT = os.path.join(REPORTS_DIR,'ntp_report_local.html')
LOCAL_REPORT_NO_NTP = os.path.join(REPORTS_DIR,'ntp_report_local_no_ntp.html')
CONF_FILE = 'modules/test/' + MODULE + '/conf/module_config.json'

# Define the capture files to be used for the test
NTP_SERVER_CAPTURE_FILE = os.path.join(CAPTURES_DIR,'ntp.pcap')
STARTUP_CAPTURE_FILE = os.path.join(CAPTURES_DIR,'startup.pcap')
MONITOR_CAPTURE_FILE = os.path.join(CAPTURES_DIR,'monitor.pcap')


class NTPModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.environ['DEVICE_MAC'] = '38:d1:35:09:01:8e'

  # Test the module report generation
  def ntp_module_report_test(self):
    ntp_module = NTPModule(module=MODULE,
                           log_dir=OUTPUT_DIR,
                           conf_file=CONF_FILE,
                           results_dir=OUTPUT_DIR,
                           ntp_server_capture_file=NTP_SERVER_CAPTURE_FILE,
                           startup_capture_file=STARTUP_CAPTURE_FILE,
                           monitor_capture_file=MONITOR_CAPTURE_FILE)

    report_out_path = ntp_module.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()
      formatted_report = self.add_formatting(report_out)

    # Write back the new formatted_report value
    out_report_path = os.path.join(OUTPUT_DIR,'ntp_report_with_ntp.html')
    with open(out_report_path, 'w', encoding='utf-8') as file:
      file.write(formatted_report)

    # Read the local good report
    with open(LOCAL_REPORT, 'r', encoding='utf-8') as file:
      report_local = file.read()

    self.assertEqual(report_out, report_local)

  # Test the module report generation if no DNS traffic
  # is available
  def ntp_module_report_no_ntp_test(self):
    # Read the pcap files
    packets_ntp_server = rdpcap(NTP_SERVER_CAPTURE_FILE)
    packets_startup = rdpcap(STARTUP_CAPTURE_FILE)
    packets_monitor = rdpcap(MONITOR_CAPTURE_FILE)

    # Filter out packets containing NTP
    packets_ntp_server = [
        packets_ntp_server for packets_ntp_server in packets_ntp_server
        if not packets_ntp_server.haslayer(NTP)
    ]
    packets_startup = [
        packets_startup for packets_startup in packets_startup
        if not packets_startup.haslayer(NTP)
    ]
    packets_monitor = [
        packets_monitor for packets_monitor in packets_monitor
        if not packets_monitor.haslayer(NTP)
    ]

    # Write the filtered packets to a new .pcap file
    ntp_server_cap_file = os.path.join(OUTPUT_DIR, 'ntp_no_ntp.pcap')
    startup_cap_file = os.path.join(OUTPUT_DIR, 'startup_no_dns.pcap')
    monitor_cap_file = os.path.join(OUTPUT_DIR, 'monitor_no_dns.pcap')
    wrpcap(ntp_server_cap_file, packets_ntp_server)
    wrpcap(startup_cap_file, packets_startup)
    wrpcap(monitor_cap_file, packets_monitor)

    ntp_module = NTPModule(module='dns',
                           log_dir=OUTPUT_DIR,
                           conf_file=CONF_FILE,
                           results_dir=OUTPUT_DIR,
                           ntp_server_capture_file=ntp_server_cap_file,
                           startup_capture_file=startup_cap_file,
                           monitor_capture_file=monitor_cap_file)

    report_out_path = ntp_module.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()
      formatted_report = self.add_formatting(report_out)

    # Write back the new formatted_report value
    out_report_path = os.path.join(OUTPUT_DIR,'ntp_report_no_ntp.html')
    with open(out_report_path, 'w', encoding='utf-8') as file:
      file.write(formatted_report)

    # Read the local good report
    with open(LOCAL_REPORT_NO_NTP, 'r', encoding='utf-8') as file:
      report_local = file.read()

    self.assertEqual(report_out, report_local)

  def add_formatting(self,body):
    return f'''
    <!DOCTYPE html>
    <html lang="en">
    {TestReport().generate_head()}
    <body>
      {body}
    </body>
    </html'''

if __name__ == '__main__':
  suite = unittest.TestSuite()
  # Module report test
  suite.addTest(NTPModuleTest('ntp_module_report_test'))
  suite.addTest(NTPModuleTest('ntp_module_report_no_ntp_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
