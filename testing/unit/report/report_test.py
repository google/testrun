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
TEST_FILES_DIR = os.path.join('testing/unit', MODULE)
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')


class ReportTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

  def create_report(self, results_file_path):
    report = TestReport()
    # Load the json report data
    with open(results_file_path, 'r', encoding='utf-8') as file:
      report_json = json.loads(file.read())
    report.from_json(report_json)
    # Load all module html reports
    reports_md = []
    #reports_md.append(self.get_module_html_report('tls'))
    reports_md.append(self.get_module_html_report('dns'))
    reports_md.append(self.get_module_html_report('nmap'))
    reports_md.append(self.get_module_html_report('ntp'))
    report.add_module_reports(reports_md)

    # Save report to file
    file_name = os.path.splitext(os.path.basename(results_file_path))[0]
    report_out_file = os.path.join(OUTPUT_DIR, file_name + '.html')
    with open(report_out_file, 'w', encoding='utf-8') as file:
      file.write(report.to_html())

  def report_compliant_test(self):
    self.create_report(os.path.join(TEST_FILES_DIR, 'report_compliant.json'))

  def report_noncompliant_test(self):
    self.create_report(os.path.join(TEST_FILES_DIR, 'report_noncompliant.json'))

  def get_module_html_report(self, module):
    # Combine the path components using os.path.join
    report_file = os.path.join(
        UNIT_TEST_DIR,
        os.path.join(module,
                     os.path.join('reports', module + '_report_local.html')))

    with open(report_file, 'r', encoding='utf-8') as file:
      report = file.read()
    return report


if __name__ == '__main__':
  suite = unittest.TestSuite()
  suite.addTest(ReportTest('report_compliant_test'))
  suite.addTest(ReportTest('report_noncompliant_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
