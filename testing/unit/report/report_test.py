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
import shutil
from jinja2 import Template
import re

MODULE = 'report'

# Define the file paths
UNIT_TEST_DIR = 'testing/unit/'
TEST_FILES_DIR = os.path.join('testing/unit', MODULE)
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')

REPORT_RESOURCES_DIR = 'resources/report'

CSS_PATH = os.path.join(REPORT_RESOURCES_DIR, 'test_report_styles.css')
HTML_PATH = os.path.join(REPORT_RESOURCES_DIR, 'test_report_template.html')

class ReportTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    """Class-level setup to prepare for tests"""

    # Delete old files from output dir
    if os.path.exists(OUTPUT_DIR) and os.path.isdir(OUTPUT_DIR):
      shutil.rmtree(OUTPUT_DIR)

    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

  def create_report(self, results_file_path):
    """Create the HTML report from the JSON file"""

    # Create the TestReport object
    report = TestReport()

    # Load the json report data
    with open(results_file_path, 'r', encoding='utf-8') as file:
      report_json = json.loads(file.read())

    # Populate the report with JSON data
    report.from_json(report_json)

    # Load each module html report
    reports_md = []
    reports_md.append(self.get_module_html_report('dns'))
    reports_md.append(self.get_module_html_report('services'))
    reports_md.append(self.get_module_html_report('ntp'))

    # Add all the module reports to the full report
    report.add_module_reports(reports_md)

    # Create the HTML filename based on the JSON name
    file_name = os.path.splitext(os.path.basename(results_file_path))[0]
    report_out_file = os.path.join(OUTPUT_DIR, file_name + '.html')

     # Save report as HTML file
    with open(report_out_file, 'w', encoding='utf-8') as file:
      file.write(report.to_html())

  def report_compliant_test(self):
    """Generate a report for the compliant test"""

    # Generate a compliant report based on the 'report_compliant.json' file
    self.create_report(os.path.join(TEST_FILES_DIR, 'report_compliant.json'))

  def report_noncompliant_test(self):
    """Generate a report for the non-compliant test"""

    # Generate non-compliant report based on the 'report_noncompliant.json' file
    self.create_report(os.path.join(TEST_FILES_DIR, 'report_noncompliant.json'))

  # Generate formatted reports for each report generated from
  # the test containers.
  # Not a unit test but can't run from within the test module container and must
  # be done through the venv. Useful for doing visual inspections
  # of report formatting changes without having to re-run a new device test.
  def report_formatting(self):
    """Apply formatting and generate HTML reports for visual inspection"""

     # List of modules for which to generate formatted reports
    test_modules = ['conn','dns','ntp','protocol','services','tls']

    # List all items from UNIT_TEST_DIR
    unit_tests = os.listdir(UNIT_TEST_DIR)

    # Loop through each items from UNIT_TEST_DIR
    for test in unit_tests:

      # If the module name inside the test_modules list
      if test in test_modules:

        # Construct the module path of outpit dir for the module
        output_dir = os.path.join(UNIT_TEST_DIR,test,'output')

        # Check if output dir exists
        if os.path.isdir(output_dir):
          # List all files fro output dir
          output_files = os.listdir(output_dir)

          # Loop through each file
          for file in output_files:

            # Chck if is an html file
            if file.endswith('.html'):

              # Construct teh full path of html file
              report_out_path = os.path.join(output_dir,file)

              # Open the html file in read mode
              with open(report_out_path, 'r', encoding='utf-8') as f:
                report_out = f.read()
                # Add the formatting
                formatted_report = self.add_html_formatting(report_out)

                # Write back the new formatted_report value
                out_report_dir = os.path.join(OUTPUT_DIR, test)
                os.makedirs(out_report_dir, exist_ok=True)

                with open(os.path.join(
                  out_report_dir,file), 'w',
                  encoding='utf-8') as f:
                  f.write(formatted_report)

  def add_html_formatting(self, body):
    """Wrap the raw report inside a complete HTML structure with styles"""

    # Load the css file
    with open(CSS_PATH, 'r', encoding='UTF-8') as css_file:
      styles = css_file.read()

    # Load the html file
    with open(HTML_PATH, 'r', encoding='UTF-8') as html_file:
      html_content = html_file.read()

      # Search for head content using regex
      head = re.search(r'<head.*?>.*?</head>', html_content, re.DOTALL).group(0)
    # Define the html template
    html_template = f'''
    <!DOCTYPE html>
    <html lang="en">
    {head}
    <body>
      {body}
    </body>
    </html>
    '''
    # Create a Jinja2 template from the string
    template = Template(html_template)

    # Render the template with css styles
    return template.render(styles=styles, body=body)

  def get_module_html_report(self, module):
    """Load the HTML report for a specific module"""

    # Define the path to the module's HTML report file
    report_file = os.path.join(
        UNIT_TEST_DIR,
        os.path.join(module,
                     os.path.join('reports', module + '_report_local.html')))

    # Read and return the content of the report file
    with open(report_file, 'r', encoding='utf-8') as file:
      report = file.read()
    return report


if __name__ == '__main__':

  suite = unittest.TestSuite()
  suite.addTest(ReportTest('report_compliant_test'))
  suite.addTest(ReportTest('report_noncompliant_test'))

  # Create html test reports for each module in 'output' dir
  suite.addTest(ReportTest('report_formatting'))

  runner = unittest.TextTestRunner()
  runner.run(suite)
