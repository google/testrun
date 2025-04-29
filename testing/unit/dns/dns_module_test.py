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
import os
import sys

MODULE = 'dns'

# Define the directories
TEST_FILES_DIR = 'testing/unit/' + MODULE
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')
REPORTS_DIR = os.path.join(TEST_FILES_DIR, 'reports/')
CAPTURES_DIR = os.path.join(TEST_FILES_DIR, 'captures/')
DNS_NON_DHCP_SERVER_DIR = os.path.join(CAPTURES_DIR, 'dns_non_dhcp_server')
DNS_DHCP_SERVER_DIR = os.path.join(CAPTURES_DIR, 'dns_dhcp_server')
DNS_NO_DNS_DIR = os.path.join(CAPTURES_DIR, 'dns_no_dns')

LOCAL_REPORT = os.path.join(REPORTS_DIR, 'dns_report_local.html')
LOCAL_REPORT_NO_DNS = os.path.join(REPORTS_DIR, 'dns_report_local_no_dns.html')

# The capture files with dns traffic to the provided dhcp server
DNS_DHCP_SERVER_CAPTURE = os.path.join(DNS_DHCP_SERVER_DIR, 'dns.pcap')
STARTUP_DHCP_SERVER_CAPTURE = os.path.join(DNS_DHCP_SERVER_DIR, 'startup.pcap')
MONITOR_DHCP_SERVER_CAPTURE = os.path.join(DNS_DHCP_SERVER_DIR, 'monitor.pcap')

# The capture files with dns traffic to non-dhcp server
DNS_NON_DHCP_SERVER_CAPTURE = os.path.join(DNS_NON_DHCP_SERVER_DIR, 'dns.pcap')
STARTUP_NON_DHCP_SERVER_CAPTURE = os.path.join(DNS_NON_DHCP_SERVER_DIR,
                                               'startup.pcap')
MONITOR_NON_DHCP_SERVER_CAPTURE = os.path.join(DNS_NON_DHCP_SERVER_DIR,
                                               'monitor.pcap')

# The capture files with no dns traffic
DNS_NO_DNS_CAPTURE = os.path.join(DNS_NO_DNS_DIR, 'dns.pcap')
STARTUP_NO_DNS_CAPTURE = os.path.join(DNS_NO_DNS_DIR, 'startup.pcap')
MONITOR_NO_DNS_CAPTURE = os.path.join(DNS_NO_DNS_DIR, 'monitor.pcap')

class DNSModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Set the MAC address for device in capture files
    os.environ['DEVICE_MAC'] = '38:d1:35:01:17:fe'

  # Test the module report generation
  def dns_module_report_test(self):

    # Create a DNSModule instance
    dns_module = DNSModule(module=MODULE,
                           results_dir=OUTPUT_DIR,
                           dns_server_capture_file=DNS_DHCP_SERVER_CAPTURE,
                           startup_capture_file=STARTUP_DHCP_SERVER_CAPTURE,
                           monitor_capture_file=MONITOR_DHCP_SERVER_CAPTURE)

    # Generate the report
    report_out_path = dns_module.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT, 'r', encoding='utf-8') as file:
      report_local = file.read()

    # Assert that the generated report is equal to the local report
    self.assertEqual(report_out, report_local)

  # Test the module report generation if no DNS traffic found
  def dns_module_report_no_dns_test(self):

    # Create a DNSModule instance
    dns_module = DNSModule(module=MODULE,
                           results_dir=OUTPUT_DIR,
                           dns_server_capture_file=DNS_NO_DNS_CAPTURE,
                           startup_capture_file=STARTUP_NO_DNS_CAPTURE,
                           monitor_capture_file=MONITOR_NO_DNS_CAPTURE)

    # Create the report
    report_out_path = dns_module.generate_module_report()

    # Generate the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT_NO_DNS, 'r', encoding='utf-8') as file:
      report_local = file.read()

    # Assert that the generated report is equal to the local report
    self.assertEqual(report_out, report_local)

  # Test the extraction of DNS data
  def extract_dns_data_test(self):

    # Create a DNSModule instance
    dns_module = DNSModule(module=MODULE,
                           results_dir=OUTPUT_DIR,
                           dns_server_capture_file=DNS_DHCP_SERVER_CAPTURE,
                           startup_capture_file=STARTUP_DHCP_SERVER_CAPTURE,
                           monitor_capture_file=MONITOR_DHCP_SERVER_CAPTURE)

    # Extract the DNS data
    dns_data = dns_module.extract_dns_data()

    self.assertTrue(len(dns_data) > 0)

  # Test dns.network.from_dhcp for traffic detected to DHCP server
  def dns_traffic_to_dhcp_provided_server_test(self):

    # Create a DNSModule instance
    dns_module = DNSModule(module=MODULE,
                           results_dir=OUTPUT_DIR,
                           dns_server_capture_file=DNS_DHCP_SERVER_CAPTURE,
                           startup_capture_file=STARTUP_DHCP_SERVER_CAPTURE,
                           monitor_capture_file=MONITOR_DHCP_SERVER_CAPTURE)

    # Get the  result from dns.network.from_dhcp test
    result = dns_module.dns_network_from_dhcp()

    # Assign the expected test result
    description = 'DNS traffic detected only to DHCP provided server'
    expected_result = ('Informational', description)

    # Assert that the actual result matches the expected result
    self.assertEqual(expected_result, result)

  # Test dns.network.from_dhcp for traffic detected to non-DHCP servers
  def dns_traffic_to_non_dhcp_server_test(self):

    # Set the MAC address for device in capture files
    os.environ['DEVICE_MAC'] = '00:30:64:8a:c8:cc'

    # Create a DNSModule instance
    dns_module = DNSModule(module=MODULE,
                           results_dir=OUTPUT_DIR,
                           dns_server_capture_file=DNS_NON_DHCP_SERVER_CAPTURE,
                           startup_capture_file=STARTUP_NON_DHCP_SERVER_CAPTURE,
                           monitor_capture_file=MONITOR_NON_DHCP_SERVER_CAPTURE)

    # Get the  result from dns.network.from_dhcp test
    result = dns_module.dns_network_from_dhcp()

    # Assign the expected test result
    description = 'DNS traffic detected to non-DHCP provided server'
    expected_result = ('Informational', description)

    # Assert that the actual result matches the expected result
    self.assertEqual(expected_result, result)

  # Test dns.network.from_dhcp when no traffic is detected
  def dns_no_dns_traffic_test(self):

    # Create a DNSModule instance
    dns_module = DNSModule(module=MODULE,
                           results_dir=OUTPUT_DIR,
                           dns_server_capture_file=DNS_NO_DNS_CAPTURE,
                           startup_capture_file=STARTUP_NO_DNS_CAPTURE,
                           monitor_capture_file=MONITOR_NO_DNS_CAPTURE)

    # Get the  result from dns.network.from_dhcp test
    result = dns_module.dns_network_from_dhcp()

    # Assign the expected test result
    description =''\
      'No DNS traffic detected from the device to the DHCP DNS server'
    expected_result = ('Informational', description)

    # Assert that the actual result matches the expected result.
    self.assertEqual(expected_result, result)

if __name__ == '__main__':
  suite = unittest.TestSuite()

  # Module report test
  suite.addTest(DNSModuleTest('dns_module_report_test'))
  suite.addTest(DNSModuleTest('dns_module_report_no_dns_test'))
  suite.addTest(DNSModuleTest('extract_dns_data_test'))
  suite.addTest(DNSModuleTest('dns_traffic_to_dhcp_provided_server_test'))
  suite.addTest(DNSModuleTest('dns_traffic_to_non_dhcp_server_test'))
  suite.addTest(DNSModuleTest('dns_no_dns_traffic_test'))

  # Run the tests
  runner = unittest.TextTestRunner()
  test_result = runner.run(suite)

  # Check if the tests failed and exit with the appropriate code
  if not test_result.wasSuccessful():
    sys.exit(1)  # Return a non-zero exit code for failures
  sys.exit(0)  # Return zero for success
