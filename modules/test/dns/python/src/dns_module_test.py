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
from common import logger
from scapy.all import rdpcap, DNS, IP
import os

MODULE_NAME = 'dns_module_test'

# Define the file paths
OUTPUT_DIR = 'testing/unit_test/dns/output/'
CONF_FILE = 'modules/test/dns/conf/module_config.json'
LOCAL_REPORT='testing/unit_test/dns/dns_report_local.md'
# Define the capture files to be used for the test
DNS_SERVER_CAPTURE_FILE = 'testing/unit_test/dns/dns.pcap'
STARTUP_CAPTURE_FILE = 'testing/unit_test/dns/startup.pcap'
MONITOR_CAPTURE_FILE = 'testing/unit_test/dns/monitor.pcap'

DNS_MODULE = None
PACKET_CAPTURE = None


class TLSModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directory and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    log = logger.get_logger(MODULE_NAME,log_dir=OUTPUT_DIR)

    global DNS_MODULE
    DNS_MODULE = DNSModule(module='dns',
                           log_dir=OUTPUT_DIR,
                           conf_file=CONF_FILE,
                           results_dir=OUTPUT_DIR,
                           DNS_SERVER_CAPTURE_FILE=DNS_SERVER_CAPTURE_FILE,
                           STARTUP_CAPTURE_FILE=STARTUP_CAPTURE_FILE,
                           MONITOR_CAPTURE_FILE=MONITOR_CAPTURE_FILE)

  # Test the module report generation
  def dns_module_report_test(self):
    report_out_path= DNS_MODULE.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out=file.read()

    # Read the local good report
    with open(LOCAL_REPORT, 'r', encoding='utf-8') as file:
      report_local=file.read()

    log = logger.get_logger(MODULE_NAME)

    self.assertEqual(report_out,report_local)


if __name__ == '__main__':
  suite = unittest.TestSuite()
  # Module report test
  suite.addTest(TLSModuleTest('dns_module_report_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
