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
from nmap_module import NmapModule
import unittest
import os

MODULE = 'nmap'

# Define the file paths
TEST_FILES_DIR = 'testing/unit/' + MODULE
OUTPUT_DIR = TEST_FILES_DIR + '/output/'
LOCAL_REPORT = TEST_FILES_DIR + '/nmap_report_local.md'
CONF_FILE = 'modules/test/' + MODULE + '/conf/module_config.json'


class NMAPTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

  # Test the module report generation
  def nmap_module_report_test(self):
    nmap_module = NmapModule(module=MODULE,
                             log_dir=OUTPUT_DIR,
                             conf_file=CONF_FILE,
                             results_dir=OUTPUT_DIR,
                             run=False,
                             nmap_scan_results_path=TEST_FILES_DIR)

    report_out_path = nmap_module.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT, 'r', encoding='utf-8') as file:
      report_local = file.read()

    self.assertEqual(report_out, report_local)


if __name__ == '__main__':
  suite = unittest.TestSuite()
  # Module report test
  suite.addTest(NMAPTest('nmap_module_report_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
