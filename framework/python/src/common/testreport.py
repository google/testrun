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
from common import util
import base64
import os
from test_orc.test_case import TestCase

DATE_TIME_FORMAT = '%Y-%m-%d %H:%M:%S'
RESOURCES_DIR = 'resources/report'
TESTS_FIRST_PAGE = 12
TESTS_PER_PAGE = 20

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Locate the test-run root directory, 4 levels, src->python->framework->test-run
root_dir = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))

# Obtain the report resources directory
report_resource_dir = os.path.join(root_dir, RESOURCES_DIR)

test_run_img_file = os.path.join(report_resource_dir, 'testrun.png')


class TestReport():
  """Represents a previous Testrun report."""

  def __init__(self,
               status='Non-Compliant',
               started=None,
               finished=None,
               total_tests=0):
    self._device = {}
    self._status: str = status
    self._started = started
    self._finished = finished
    self._total_tests = total_tests
    self._results = []
    self._module_reports = []
    self._report_url = ''
    self._cur_page = 0
    # Placeholder until available in json report
    self._version = 'v1.2.1-alpha'

  def add_module_reports(self, module_reports):
    self._module_reports = module_reports

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

  def set_report_url(self, url):
    self._report_url = url

  def get_report_url(self):
    return self._report_url

  def to_json(self):
    report_json = {}
    report_json['device'] = self._device
    report_json['status'] = self._status
    report_json['started'] = self._started.strftime(DATE_TIME_FORMAT)
    report_json['finished'] = self._finished.strftime(DATE_TIME_FORMAT)

    test_results = []
    for test in self._results:
      test_results.append({
        'name': test.name,
        'description': test.description,
        'expected_behavior': test.expected_behavior,
        'required_result': test.required_result,
        'result': test.result
      })

    report_json['tests'] = {'total': self._total_tests,
                            'results': test_results}
    report_json['report'] = self._report_url
    return report_json

  def from_json(self, json_file):

    self._device['mac_addr'] = json_file['device']['mac_addr']
    self._device['manufacturer'] = json_file['device']['manufacturer']
    self._device['model'] = json_file['device']['model']

    if 'firmware' in json_file['device']:
      self._device['firmware'] = json_file['device']['firmware']

    if 'test_modules' in json_file['device']:
      self._device['test_modules'] = json_file['device']['test_modules']

    self._status = json_file['status']
    self._started = datetime.strptime(json_file['started'], DATE_TIME_FORMAT)
    self._finished = datetime.strptime(json_file['finished'], DATE_TIME_FORMAT)

    if 'report' in json_file:
      self._report_url = json_file['report']
    self._total_tests = json_file['tests']['total']

    # Loop through test results
    for test_result in json_file['tests']['results']:
      test_case = TestCase(
        name=test_result['name'],
        description=test_result['description'],
        expected_behavior=test_result['expected_behavior'],
        required_result=test_result['required_result'],
        result=test_result['result'])
      self.add_test(test_case)

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
    {self.generate_head()}
    <body>
      {self.generate_body(json_data)}
    </body>
    </html>
    '''

  def generate_test_sections(self, json_data):
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

  def generate_pages(self, json_data):

    # Calculate pages
    test_count = len(json_data['tests']['results'])

    # Multiple pages required
    if test_count > TESTS_FIRST_PAGE:
      # First page
      full_page = 1

      # Remaining tests
      test_count -= TESTS_FIRST_PAGE
      full_page += (int)(test_count / TESTS_PER_PAGE)
      partial_page = 1 if test_count % TESTS_PER_PAGE > 0 else 0

    # 1 page required
    elif test_count == TESTS_FIRST_PAGE:
      full_page = 1
      partial_page = 0
    # Less than 1 page required
    else:
      full_page = 0
      partial_page = 1

    num_pages = full_page + partial_page

    pages = ''
    for _ in range(num_pages):
      self._cur_page += 1
      pages += self.generate_results_page(json_data=json_data,
                                          page_num=self._cur_page)
    return pages

  def generate_results_page(self, json_data, page_num):
    page = '<div class="page">'
    page += self.generate_header(json_data, (page_num == 1))
    if page_num == 1:
      page += self.generate_summary(json_data)
    page += self.generate_results(json_data, page_num)
    page += self.generate_footer(page_num)
    page += '</div>'
    page += '<div style="break-after:page"></div>'
    return page

  def generate_module_page(self, json_data, module_report):
    self._cur_page += 1
    page = '<div class="page">'
    page += self.generate_header(json_data, False)
    page += f'''
    <div class=module-page-content>
      {module_report}
    </div>'''
    page += self.generate_footer(self._cur_page)
    page += '</div>'  #Page end
    page += '<div style="break-after:page"></div>'
    return page

  def generate_module_pages(self, json_data):
    pages = ''
    content_max_size = 913

    for module_reports in self._module_reports:
      # ToDo: Figure out how to make this dynamic
      # Padding values  from CSS
      # Element sizes from inspection of rendered report
      h1_padding = 8
      module_summary_padding = 50 # 25 top and 25 bottom

      # Reset values for each module report
      data_table_active = False
      data_rows_active=False
      page_content = ''
      content_size = 0
      content = module_reports.split('\n')

      for line in content:
        if '<h1' in line:
          content_size += 40 + h1_padding
        elif 'module-summary' in line:
          content_size += 85.333 + module_summary_padding

        # Track module-data table state
        elif '<table class="module-data"' in line:
          data_table_active=True
        elif '</table>' in line and data_table_active:
          data_table_active=False

        # Add module-data header size, ignore rows, should
        # only be one so only care about a header existence
        elif '<thead>' in line and data_table_active:
          content_size += 41.333

        # Track module-data table state
        elif '<tbody>' in line and data_table_active:
          data_rows_active = True
        elif '</tbody>' in line and data_rows_active:
          data_rows_active = False

        # Add appropriate content size for each data row
        # update if CSS changes for this element
        elif '<tr>' in line and data_rows_active:
          content_size += 40.667

        # If the current line is within the content size limit
        # we'll add it to this page, otherweise, we'll put it on the next
        # page. Also make sure that if there is less than 40 pixels
        # left after a data row, start a new page or the row will get cut off.
        # Current row size is 40.667 so rounding to 41 padding,
        # adjust if we update the "module-data tbody tr" element.
        if content_size >= content_max_size or (
          data_rows_active and content_max_size - content_size < 41):
          # If in the middle of a table, close the table
          if data_rows_active:
            page_content += '</tbody></table>'
          page = self.generate_module_page(json_data, page_content)
          pages += page + '\n'
          content_size = 0
          # If in the middle of a data table, restart
          # it for the rest of the rows
          page_content = ('<table class=module-data></tbody>\n'
                          if data_rows_active else '')
        page_content += line + '\n'
      if len(page_content) > 0:
        page = self.generate_module_page(json_data, page_content)
        pages += page + '\n'
    return pages

  def generate_body(self, json_data):
    self._num_pages = 0
    self._cur_page = 0
    body = f'''
    <body>
      {self.generate_pages(json_data)}
      {self.generate_module_pages(json_data)}
    </body>
    '''
    # Set the max pages after all pages have been generated
    return body.replace('MAX_PAGE', str(self._cur_page))

  def generate_footer(self, page_num):
    footer = f'''
    <div class="footer">
      <div class="footer-label">Testrun {self._version}</div>
      <div class="footer-label" style="right: 0px">Page {page_num}/MAX_PAGE</div>
    </div>
    '''
    return footer

  def generate_results(self, json_data, page_num):

    result_list = '''
      <div class="result-list">
        <h3>Results List</h3>
        <div class="result-line" style="margin-top: 10px;border-top-left-radius:4px;border-top-right-radius:4px;">
          <div class="result-list-header-label" style="left: .1in">Name</div>
          <div class="result-list-header-label" style="left: 2.8in">Description</div>
          <div class="result-list-header-label" style="left: 7.3in">Result</div>
        </div>'''
    if page_num == 1:
      start = 0
    elif page_num == 2:
      start = TESTS_FIRST_PAGE
    else:
      start = (page_num - 2) * TESTS_PER_PAGE + TESTS_FIRST_PAGE
    results_on_page = TESTS_FIRST_PAGE if page_num == 1 else TESTS_PER_PAGE
    result_end = min(start + results_on_page,
                     len(json_data['tests']['results']))
    for ix in range(result_end - start):
      result = json_data['tests']['results'][ix + start]
      result_list += self.generate_result(result)
    result_list += '</div>'
    return result_list

  def generate_result(self, result):
    if result['result'] == 'Non-Compliant':
      result_class = 'result-test-result-non-compliant'
    elif result['result'] == 'Compliant':
      result_class = 'result-test-result-compliant'
    else:
      result_class = 'result-test-result-skipped'

    result_html = f'''
      <div class="result-line result-line-result">
          <div class="result-test-label" style="left: .1in;">{result['name']}</div>
          <div class="result-test-label result-test-description" style="left: 2.8in;">{result['description']}</div>
          <div class="result-test-label result-test-result {result_class}">{result['result']}</div>
      </div>
      '''
    return result_html

  def generate_header(self, json_data, first_page):
    with open(test_run_img_file, 'rb') as f:
      tr_img_b64 = base64.b64encode(f.read()).decode('utf-8')
    header = ''

    if first_page:
      header += f'''
        <div class="header">
          <h1>Testrun report</h1>
          <h2 style="top: 50%;max-width:700px">
            {json_data["device"]["manufacturer"]}
            {json_data["device"]["model"]}
          </h2>'''
    else:
      header += f'''
        <div class="header" style="margin-bottom:1px solid #DADCE0">
          <h1>Testrun report</h1>
          <h3 style="margin-top:0;max-width:700px">
            {json_data["device"]["manufacturer"]}
            {json_data["device"]["model"]}
          </h3>'''
    header += f'''<img src="data:image/png;base64,
      {tr_img_b64}" alt="Testrun" width="90" style="position: absolute;top: 40%; right: 0px;"></img>
    </div>
    '''
    return header

  def generate_summary(self, json_data):
    # Generate the basic content section layout
    summary = '''
     <div class="summary-content">
     '''
    # Add the device information
    manufacturer = (json_data['device']['manufacturer']
                    if 'manufacturer' in json_data['device'] else 'Undefined')
    model = (json_data['device']['model']
             if 'model' in json_data['device'] else 'Undefined')
    fw = (json_data['device']['firmware']
          if 'firmware' in json_data['device'] else 'Undefined')
    mac = (json_data['device']['mac_addr']
           if 'mac_addr' in json_data['device'] else 'Undefined')

    summary += '<div class="device-information">'

    summary += self.generate_device_summary_label('Manufacturer', manufacturer)
    summary += self.generate_device_summary_label('Model', model)
    summary += self.generate_device_summary_label('Firmware', fw)
    summary += self.generate_device_summary_label('MAC Address',
                                                  mac,
                                                  trailing_space=False)

    summary += '</div>'

    # Add device configuration
    summary += '''
    <div class="summary-device-modules">
      <div class="summary-item-label" style="margin-bottom:10px;">
        <h4>Device Configuration</h4>
      </div>
    '''

    if 'test_modules' in json_data['device']:

      sorted_modules = {}

      for test_module in json_data['device']['test_modules']:
        if 'enabled' in json_data['device']['test_modules'][test_module]:
          sorted_modules[test_module] = json_data['device']['test_modules'][
            test_module]['enabled']

      # Sort the modules by enabled first
      sorted_modules = sorted(sorted_modules.items(),
                              key=lambda x:x[1],
                              reverse=True)

      for module in sorted_modules:
        summary += self.generate_device_module_label(
          module[0],
          module[1]
        )

    summary += '</div>'

    # Add device configuration
    summary += '''
    <div class="summary-device-modules">
      <div class="summary-item-label" style="margin-bottom:10px;">
        <h4>Device Configuration</h4>
      </div>
    '''

    if 'test_modules' in json_data['device']:

      sorted_modules = {}

      for test_module in json_data['device']['test_modules']:
        if 'enabled' in json_data['device']['test_modules'][test_module]:
          sorted_modules[test_module] = json_data['device']['test_modules'][
            test_module]['enabled']

      # Sort the modules by enabled first
      sorted_modules = sorted(sorted_modules.items(),
                              key=lambda x:x[1],
                              reverse=True)

      for module in sorted_modules:
        summary += self.generate_device_module_label(
          module[0],
          module[1]
        )

    summary += '</div>'

    # Add the result summary
    summary += self.generate_result_summary(json_data)

    summary += '\n</div>'
    return summary

  def generate_device_module_label(self, module, enabled):
    label = '<div class="summary-device-module-label">'
    if enabled:
      label += '<span style="color:#34a853">✔ </span>'
    else:
      label += '<span style="color:#ea4335">✖ </span>'
    label += util.get_module_display_name(module)
    label += '</div>'
    return label

  def generate_result_summary(self, json_data):
    if json_data['status'] == 'Compliant':
      result_summary = '''<div class ="summary-color-box
      summary-box-compliant">'''
    else:
      result_summary = '''<div class ="summary-color-box
      summary-box-non-compliant">'''
    result_summary += self.generate_result_summary_item('Test status',
                                                        'Complete')
    result_summary += self.generate_result_summary_item(
        'Test result',
        json_data['status'],
        style='color: white; font-size:24px; font-weight: 700;')
    result_summary += self.generate_result_summary_item('Started',
                                                        json_data['started'])

    # Convert the timestamp strings to datetime objects
    start_time = datetime.strptime(json_data['started'], '%Y-%m-%d %H:%M:%S')
    end_time = datetime.strptime(json_data['finished'], '%Y-%m-%d %H:%M:%S')
    # Calculate the duration
    duration = end_time - start_time
    result_summary += self.generate_result_summary_item('Duration',
                                                        str(duration))

    result_summary += '\n</div>'
    return result_summary

  def generate_result_summary_item(self, key, value, style=None):
    summary_item = f'''<div class="summary-box-label">{key}</div>'''
    if style is not None:
      summary_item += f'''<div style="{style}"
      class="summary-box-value">{value}</div>'''
    else:
      summary_item += f'''<div class="summary-box-value">{value}</div>'''
    return summary_item

  def generate_device_summary_label(self, key, value, trailing_space=True):
    label = f'''
    <div class="summary-item-label"><h4>{key}</h4></div>
    <div class="summary-item-value">{value}</div>
    '''
    if trailing_space:
      label += '''<div class="summary-item-space"></div>'''
    return label

  def generate_head(self):
    return f'''
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Testrun Report</title>
      <style>
        {self.generate_css()}
      </style>
    </head>
    '''

  def generate_css(self):
    return '''
    /* Set some global variables */
    :root {
      --header-height: .75in;
      --header-width: 8.5in;
      --header-pos-x: 0in;
      --header-pos-y: 0in;
      --summary-width: 8.5in;
      --summary-height: 2.8in;
      --vertical-line-height: calc(var(--summary-height)-.2in);
      --vertical-line-pos-x: 25%;
    }

    @font-face {
      font-family: 'Google Sans';
      font-style: normal;
      src: url(https://fonts.gstatic.com/s/googlesans/v58/4Ua_rENHsxJlGDuGo1OIlJfC6l_24rlCK1Yo_Iqcsih3SAyH6cAwhX9RFD48TE63OOYKtrwEIJllpyk.woff2) format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }

    @font-face {
      font-family: 'Roboto Mono';
      font-style: normal;
      src: url(https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap) format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }

    /* Define some common body formatting*/
    body {
      font-family: 'Google Sans', sans-serif;
      margin: 0px;
      padding: 0px;
    }

    /* Use this for various section breaks*/
    .gradient-line {
      position: relative;
      background-image: linear-gradient(to right, red, blue, green, yellow, orange);
      height: 1px;
      /* Adjust the height as needed */
      width: 100%;
      /* To span the entire width */
      display: block;
      /* Ensures it's a block-level element */
    }

    /* Sets proper page size during print to pdf for weasyprint */
    @page {
      size: Letter;
      width: 8.5in;
      height: 11in;
    }

    .page {
      position: relative;
      margin: 0 20px;
      width: 8.5in;
      height: 11in;
    }

    /* Define the  header related css elements*/
    .header {
      position: relative;
    }

    h1 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 400;
    }

    h2 {
      margin: 0px;
      font-size: 48px;
      font-weight: 700;
    }

    h3 {
      font-size: 24px;
    }

    h4 {
      font-size: 12px;
      font-weight: 500;
      color: #5F6368;
      margin-bottom: 0;
      margin-top: 0;
    }

    .module-summary {
      background-color: #F8F9FA;
      width: 100%;
      margin-bottom: 25px;
      margin-top: 25px;
    }

    .module-summary thead tr th {
      text-align: left;
      padding-top: 15px;
      padding-left: 15px;
      font-weight: 500;
      color: #5F6368;
      font-size: 14px;
    }

    .module-summary tbody tr td {
      padding-bottom: 15px;
      padding-left: 15px;
      font-size: 24px;
    }

    .module-data {
      border: 1px solid #DADCE0;
      border-radius: 3px;
      border-spacing: 0;
    }

    .module-data thead tr th {
      text-align: left;
      padding: 12px 25px;
      color: #3C4043;
      font-size: 14px;
      font-weight: 700;
    }

    .module-data tbody tr td {
      text-align: left;
      padding: 12px 25px;
      color: #3C4043;
      font-size: 14px;
      font-weight: 400;
      border-top: 1px solid #DADCE0;
      font-family: 'Roboto Mono', monospace;
    }

    .callout-container.info {
      background-color: #e8f0fe;
    }

    .callout-container.info .icon {
      width: 22px;
      height: 22px;
      margin-right: 5px;
      background-size: contain;
      background-image: url('data:image/png;base64,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');
    }

    .callout-container {
      display: flex;
      box-sizing: border-box;
      height: auto;
      min-height: 48px;
      padding: 6px 24px;
      border-radius: 8px;
      align-items: center;
      gap: 10px;
      color: #3c4043;
      font-size: 14px;
    }

    .device-information {
      padding-top: 0.2in;
      padding-left: 0.3in;
      background-color: #F8F9FA;
      width: 250px;
      height: 2.6in;
    }

    /* Define the summary related css elements*/
    .summary-content {
      position: relative;
      width: var(--summary-width);
      height: var(--summary-height);
      margin-top: 19px;
      margin-bottom: 19px;
      background-color: #E8EAED;
    }

    .summary-item-label {
      position: relative;
    }

    .summary-item-value {
      position: relative;
      font-size: 20px;
      font-weight: 400;
      color: #202124;
    }

    .summary-item-space {
      position: relative;
      padding-bottom: 15px;
      margin: 0;
    }

    .summary-device-modules {
      position: absolute;
      left: 3.2in;
      top: .3in;
    }

    .summary-device-module-label {
      font-size: 16px;
      font-weight: 500;
      color: #202124;
      width: fit-content;
      margin-bottom: 0.1in;
    }

    .summary-vertical-line {
      width: 1px;
      height: var(--vertical-line-height);
      background-color: #80868B;
      position: absolute;
      top: .3in;
      bottom: .1in;
      left: 3in;
    }

    /* CSS for the color box */
    .summary-color-box {
      position: absolute;
      right: 0in;
      top: 0in;
      width: 2.6in;
      height: var(--summary-height);
    }

    .summary-box-compliant {
      background-color: rgb(24, 128, 56);
    }

    .summary-box-non-compliant {
      background-color: #b31412;
    }

    .summary-box-label {
      font-size: 14px;
      margin-top: 5px;
      color: #DADCE0;
      position: relative;
      top: 10px;
      left: 20px;
      font-weight: 500;
    }

    .summary-box-value {
      font-size: 18px;
      margin: 0 0 10px 0;
      color: #ffffff;
      position: relative;
      top: 10px;
      left: 20px;
    }

    .result-list-title {
      font-size: 24px;
    }

    .result-list {
      position: relative;
      margin-top: .2in;
      font-size: 18px;
    }

    .result-line {
      border: 1px solid #D3D3D3;
      /* Light Gray border*/
      height: .4in;
      width: 8.5in;
    }

    .result-line-result {
      border-top: 0px;
    }

    .result-list-header-label {
      font-weight: 500;
      position: absolute;
      font-size: 12px;
      font-weight: bold;
      height: 40px;
      display: flex;
      align-items: center;
    }

    .result-test-label {
      position: absolute;
      font-size: 12px;
      margin-top: 12px;
      max-width: 300px;
      font-weight: normal;
      align-items: center;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .result-test-description {
      max-width: 380px;
    }

    .result-test-result-non-compliant {
      background-color: #FCE8E6;
      color: #C5221F;
      left: 7.02in;
    }

    .result-test-result {
      position: absolute;
      font-size: 12px;
      width: fit-content;
      height: 12px;
      margin-top: 8px;
      padding: 4px 4px 7px 5px;
      border-radius: 2px;
    }

    .result-test-result-compliant {
      background-color: #E6F4EA;
      color: #137333;
      left: 7.16in;
    }

    .result-test-result-skipped {
      background-color: #e3e3e3;
      color: #393939;
      left: 7.2in;
    }

    /* CSS for the footer */
    .footer {
      position: absolute;
      height: 30px;
      width: 8.5in;
      bottom: 0in;
      border-top: 1px solid #D3D3D3;
    }

    .footer-label {
      color: #3C4043;
      position: absolute;
      top: 5px;
      font-size: 12px;
    }

    /*CSS for the markdown tables */
    .markdown-table {
      border-collapse: collapse;
      margin-left: 20px;
      background-color: #F8F9FA;
    }

    .markdown-table th, .markdown-table td {
      border: none;
      text-align: left;
      padding: 8px;
    }

    .markdown-header-h1 {
      margin-top:20px;
      margin-bottom:20px;
      margin-right:0px;
      font-size: 2em;
    }

    .markdown-header-h2 {
      margin-top:20px;
      margin-bottom:20px;
      margin-right:0px;
      font-size: 1.5em;
    }

    .module-page-content {
      /*Page height minus header(93px), footer(30px), 
      and a 20px bottom padding.*/
      height: calc(11in - 93px - 30px - 20px);
      
      /* In case we mess something up in our calculations
        we'll cut off the content of the page so 
        the header, footer and line break work
        as expected
      */
      overflow: hidden;
    }

    .module-page-content h1 {
      font-size: 32px;
    }

    @media print {
      @page {
        size: Letter;
        width: 8.5in;
        height: 11in;
      }
    }'''
