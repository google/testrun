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
import unittest
from testreport import TestReport
import os
import json

MODULE = 'report'

# Define the file paths
UNIT_TEST_DIR = 'testing/unit/'
TEST_FILES_DIR = os.path.join('testing/unit',MODULE)
OUTPUT_DIR = os.path.join(TEST_FILES_DIR,'output/')

class ReportTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

  def report_test(self):
    report = TestReport()

    # Load the json report data
    with open(os.path.join(TEST_FILES_DIR, 'report.json'),
              'r',
              encoding='utf-8') as file:
      report_json = json.loads(file.read())
    report.from_json(report_json)

    # Load all module markdown reports
    reports_md = []
    reports_md.append(self.get_module_md_report('dns'))
    reports_md.append(self.get_module_md_report('nmap'))
    reports_md.append(self.get_module_md_report('ntp'))
    report.add_module_reports(reports_md)

    # Generate the report
    with open(os.path.join(OUTPUT_DIR, 'report.html'), 'w',
              encoding='utf-8') as file:
      file.write(report.to_html())

  def get_module_md_report(self, module):
    # Combine the path components using os.path.join
    report_file = os.path.join(UNIT_TEST_DIR,
      os.path.join(module,
        os.path.join('reports',module+'_report_local.md')))

    with open(report_file, 'r', encoding='utf-8') as file:
      report = file.read()
    return report


if __name__ == '__main__':
  suite = unittest.TestSuite()
  suite.addTest(ReportTest('report_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
