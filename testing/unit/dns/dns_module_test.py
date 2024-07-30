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
from dns_module import DNSModule
import unittest
from scapy.all import rdpcap, DNS, wrpcap
import os

MODULE = 'dns'

# Define the directories
TEST_FILES_DIR = 'testing/unit/' + MODULE
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')
REPORTS_DIR = os.path.join(TEST_FILES_DIR, 'reports/')
CAPTURES_DIR = os.path.join(TEST_FILES_DIR, 'captures/')

LOCAL_REPORT = os.path.join(REPORTS_DIR, 'dns_report_local.html')
LOCAL_REPORT_NO_DNS = os.path.join(REPORTS_DIR, 'dns_report_local_no_dns.html')

# Define the capture files to be used for the test
DNS_SERVER_CAPTURE_FILE = os.path.join(CAPTURES_DIR, 'dns.pcap')
STARTUP_CAPTURE_FILE = os.path.join(CAPTURES_DIR, 'startup.pcap')
MONITOR_CAPTURE_FILE = os.path.join(CAPTURES_DIR, 'monitor.pcap')


class TLSModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Set the MAC address for device in capture files
    os.environ['DEVICE_MAC'] = '38:d1:35:01:17:fe'

  # Test the module report generation
  def dns_module_report_test(self):
    dns_module = DNSModule(module=MODULE,
                           log_dir=OUTPUT_DIR,
                           results_dir=OUTPUT_DIR,
                           dns_server_capture_file=DNS_SERVER_CAPTURE_FILE,
                           startup_capture_file=STARTUP_CAPTURE_FILE,
                           monitor_capture_file=MONITOR_CAPTURE_FILE)

    report_out_path = dns_module.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT, 'r', encoding='utf-8') as file:
      report_local = file.read()

    self.assertEqual(report_out, report_local)

  # Test the module report generation if no DNS traffic
  # is available
  def dns_module_report_no_dns_test(self):
    # Read the pcap files
    packets_dns_server = rdpcap(DNS_SERVER_CAPTURE_FILE)
    packets_startup = rdpcap(STARTUP_CAPTURE_FILE)
    packets_monitor = rdpcap(MONITOR_CAPTURE_FILE)

    # Filter out packets containing DNS
    packets_dns_server = [
        packets_dns_server for packets_dns_server in packets_dns_server
        if not packets_dns_server.haslayer(DNS)
    ]
    packets_startup = [
        packets_startup for packets_startup in packets_startup
        if not packets_startup.haslayer(DNS)
    ]
    packets_monitor = [
        packets_monitor for packets_monitor in packets_monitor
        if not packets_monitor.haslayer(DNS)
    ]

    # Write the filtered packets to a new .pcap file
    dns_server_cap_file = os.path.join(OUTPUT_DIR, 'dns_no_dns.pcap')
    startup_cap_file = os.path.join(OUTPUT_DIR, 'startup_no_dns.pcap')
    monitor_cap_file = os.path.join(OUTPUT_DIR, 'monitor_no_dns.pcap')
    wrpcap(dns_server_cap_file, packets_dns_server)
    wrpcap(startup_cap_file, packets_startup)
    wrpcap(monitor_cap_file, packets_monitor)

    dns_module = DNSModule(module='dns',
                           log_dir=OUTPUT_DIR,
                           results_dir=OUTPUT_DIR,
                           dns_server_capture_file=dns_server_cap_file,
                           startup_capture_file=startup_cap_file,
                           monitor_capture_file=monitor_cap_file)

    report_out_path = dns_module.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT_NO_DNS, 'r', encoding='utf-8') as file:
      report_local = file.read()

    self.assertEqual(report_out, report_local)

if __name__ == '__main__':
  suite = unittest.TestSuite()
  # Module report test
  suite.addTest(TLSModuleTest('dns_module_report_test'))
  suite.addTest(TLSModuleTest('dns_module_report_no_dns_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
