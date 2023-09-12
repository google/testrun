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

"""Store previous test run information."""

from datetime import datetime
from weasyprint import HTML
from io import BytesIO

DATE_TIME_FORMAT = '%Y-%m-%d %H:%M:%S'

class TestReport():
  """Represents a previous Test Run report."""

  def __init__(self,
               status='Non-Compliant',
               started=None,
               finished=None,
               total_tests=0
              ):
    self._device = {}
    self._status: str = status
    self._started = started
    self._finished = finished
    self._total_tests = total_tests
    self._results = []

  def get_status(self):
    return self._status

  def get_started(self):
    return self._started

  def get_finished(self):
    return self._finished

  def get_duration_seconds(self):
    diff = self._finished - self._started
    return diff.total_seconds()

  def get_duration(self):
    return str(datetime.timedelta(seconds=self.get_duration_seconds()))

  def add_test(self, test):
    self._results.append(test)

  def to_json(self):
    report_json = {}
    report_json['device'] = self._device
    report_json['status'] = self._status
    report_json['started'] = self._started.strftime(DATE_TIME_FORMAT)
    report_json['finished'] = self._finished.strftime(DATE_TIME_FORMAT)
    report_json['tests'] = {'total': self._total_tests,
                            'results': self._results}
    return report_json

  def from_json(self, json_file):

    self._device['mac_addr'] = json_file['device']['mac_addr']
    self._device['manufacturer'] = json_file['device']['manufacturer']
    self._device['model'] = json_file['device']['model']

    if 'firmware' in self._device:
      self._device['firmware'] = json_file['device']['firmware']

    self._status = json_file['status']
    self._started = datetime.strptime(json_file['started'], DATE_TIME_FORMAT)
    self._finished = datetime.strptime(json_file['finished'], DATE_TIME_FORMAT)
    self._total_tests = json_file['tests']['total']

    # Loop through test results
    for test_result in json_file['tests']['results']:
      self.add_test(test_result)

    return self

  # Create a pdf file in memory and return the bytes
  def to_pdf(self):
    # Resolve the data as html first
    report_html = self.to_html()

    # Convert HTML to PDF in memory using weasyprint
    pdf_bytes = BytesIO()
    HTML(string=report_html).write_pdf(pdf_bytes)
    return pdf_bytes

  def to_html(self):
    json_data = self.to_json()
    return f'''
    <!DOCTYPE html>
    <html lang="en">
    {self.generate_header()}
    <body>
      <h1>Test Results Summary</h1>
      
      <div class="summary">
        <h2>Device Information</h2>
        <p><strong>MAC Address:</strong> {json_data["device"]["mac_addr"]}</p>
        <p><strong>Manufacturer:</strong> {json_data["device"]["manufacturer"] or "Unknown"}</p>
        <p><strong>Model:</strong> {json_data["device"]["model"]}</p>
      </div>
      
      <h2>Test Results</h2>
      {self.generate_test_sections(json_data)}
    </body>
    </html>
    '''

  def generate_test_sections(self,json_data):
    results = json_data['tests']['results']
    sections = ''
    for result in results:
      sections += self.generate_test_section(result)
    return sections

  def generate_test_section(self, result):
    section_content = '<section class="test-section">\n'
    for key, value in result.items():
      if value is not None:  # Check if the value is not None
        # Replace underscores and capitalize
        formatted_key = key.replace('_', ' ').title()
        section_content += f'<p><strong>{formatted_key}:</strong> {value}</p>\n'
    section_content += '</section>\n<div style="margin-bottom: 40px;"></div>\n'
    return section_content

  def generate_header(self):
    return f'''
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Results Summary</title>
      <style>
        {self.generate_css()}
      </style>
    </head>
    '''

  def generate_css(self):
    return '''
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
    }
    h1 {
      margin-bottom: 10px;
    }
    .summary {
      border: 1px solid #ccc;
      padding: 10px;
      margin-bottom: 20px;
      background-color: #f5f5f5;
    }
    .test-list {
      list-style: none;
      padding: 0;
    }
    .test-item {
      margin-bottom: 10px;
    }
    .test-link {
      text-decoration: none;
      color: #007bff;
    }
    '''
