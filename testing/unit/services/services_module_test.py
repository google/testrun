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
"""Module run all the services related unit tests"""
from services_module import ServicesModule
import unittest
import os
import shutil
# from testreport import TestReport

MODULE = 'services'

# Define the file paths
TEST_FILES_DIR = 'testing/unit/' + MODULE
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')
REPORTS_DIR = os.path.join(TEST_FILES_DIR, 'reports/')
RESULTS_DIR = os.path.join(TEST_FILES_DIR, 'results/')

LOCAL_REPORT = os.path.join(REPORTS_DIR, 'services_report_local.html')
LOCAL_REPORT_ALL_CLOSED = os.path.join(REPORTS_DIR,
                                       'services_report_all_closed_local.html')

class ServicesTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

  # Test the module report generation
  def services_module_ports_open_report_test(self):
    # Move test scan into expected folder
    src_scan_results_path = os.path.join(RESULTS_DIR,
                                         'ports_open_scan_result.json')
    dst_scan_results_path = os.path.join(
      OUTPUT_DIR, 'services_scan_results.json')
    shutil.copy(src_scan_results_path, dst_scan_results_path)

    services_module = ServicesModule(module=MODULE,
                             log_dir=OUTPUT_DIR,
                             results_dir=OUTPUT_DIR,
                             run=False,
                             nmap_scan_results_path=OUTPUT_DIR)

    report_out_path = services_module.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT, 'r', encoding='utf-8') as file:
      report_local = file.read()

    self.assertEqual(report_out, report_local)

    # Test the module report generation with all ports closed
  def services_module_report_all_closed_test(self):
    src_scan_results_path = os.path.join(RESULTS_DIR,
                                         'all_closed_scan_result.json')
    dst_scan_results_path = os.path.join(
      OUTPUT_DIR, 'services_scan_results.json')
    shutil.copy(src_scan_results_path, dst_scan_results_path)

    services_module = ServicesModule(module=MODULE,
                             log_dir=OUTPUT_DIR,
                             results_dir=OUTPUT_DIR,
                             run=False,
                             nmap_scan_results_path=OUTPUT_DIR)

    report_out_path = services_module.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT_ALL_CLOSED, 'r', encoding='utf-8') as file:
      report_local = file.read()

    self.assertEqual(report_out, report_local)

if __name__ == '__main__':
  suite = unittest.TestSuite()
  # Module report test
  suite.addTest(ServicesTest('services_module_ports_open_report_test'))
  suite.addTest(ServicesTest('services_module_report_all_closed_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
