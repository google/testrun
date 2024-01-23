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

DATE_TIME_FORMAT = '%Y-%m-%d %H:%M:%S'
RESOURCES_DIR = 'resources/report'
TESTS_FIRST_PAGE = 12
TESTS_PER_PAGE = 20

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Locate the test-run root directory, 4 levels, src->python->framework->test-run
root_dir = os.path.dirname(os.path.dirname(
  os.path.dirname(os.path.dirname(current_dir))))

# Obtain the report resources directory
report_resource_dir = os.path.join(root_dir,
                                    RESOURCES_DIR)

test_run_img_file = os.path.join(report_resource_dir, 'testrun.png')

class TestReport():
  """Represents a previous Testrun report."""

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
    self._report_url = ''

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
    report_json['tests'] = {'total': self._total_tests,
                            'results': self._results}
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
      self.add_test(test_result)

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

    max_page = full_page + partial_page

    pages = ''
    for i in range(max_page):
      pages += self.generate_page(json_data, i+1, max_page)
    return pages

  def generate_page(self, json_data, page_num, max_page):
    # Placeholder until available in json report
    version = 'v1.1.1 (2024-01-31)'
    page = '<div class="page">'
    page += self.generate_header(json_data)
    if page_num == 1:
      page += self.generate_summary(json_data)
    page += self.generate_results(json_data, page_num)
    page += self.generate_footer(page_num,max_page,version)
    page += '</div>'
    if page_num < max_page:
      page += '<div style="break-after:page"></div>'
    return page

  def generate_body(self, json_data):
    return f'''
    <body>
      {self.generate_pages(json_data)}
    </body>
    '''

  def generate_footer(self, page_num, max_page, version):
    footer = f'''
    <div class="footer">
      <img style="margin-bottom:10px;width:100%;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABFgAAAABCAYAAADqzRqJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA3SURBVHgB7cAxAQAQFEXRJ4MIMkjwS9hklMCoi1EBWljePWlHvQIAMy2mAMDNKV3ADysPAYCbB6fxBrzkZ2KOAAAAAElFTkSuQmCC" />
      <div class="footer-label">Testrun {version}</div>
      <div class="footer-label" style="right: 0px">Page {page_num}/{max_page}</div>
    </div>
    '''
    return footer

  def generate_results(self, json_data, page_num):

    result_list = '''
      <img style="margin-bottom:10px;width:100%;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABFgAAAABCAYAAADqzRqJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA3SURBVHgB7cAxAQAQFEXRJ4MIMkjwS9hklMCoi1EBWljePWlHvQIAMy2mAMDNKV3ADysPAYCbB6fxBrzkZ2KOAAAAAElFTkSuQmCC" />
      <div class="result-list">
        <span class="result-list-title">Results List</span>
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
      start = (page_num-2) * TESTS_PER_PAGE + TESTS_FIRST_PAGE
    results_on_page = TESTS_FIRST_PAGE if page_num == 1 else TESTS_PER_PAGE
    result_end = min(start+results_on_page, len(json_data['tests']['results']))
    for ix in range(result_end-start):
      result = json_data['tests']['results'][ix+start]
      result_list += self.generate_result(result)
    result_list += '</div>'
    return result_list

  def generate_result(self,result):
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

  def generate_header(self, json_data):
    with open(test_run_img_file, 'rb') as f:
      tr_img_b64 = base64.b64encode(f.read()).decode('utf-8')
    return f'''
    <div class="header">
      <h3 class="header-text">Testrun report</h3>
      <h1 class="header-title" style="top: 50%;">{json_data["device"]["manufacturer"]} {json_data["device"]["model"]}</h1>
      <img src="data:image/png;base64,{tr_img_b64}" alt="Test Run" width="90" style="position: absolute;top: 40%; right: 0px;"></img>
    </div>
    '''

  def generate_summary(self, json_data):
    # Generate the basic content section layout
    summary =  '''
     <div class="summary-content">
      <img style="margin-bottom:30px;width:100%;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABFgAAAABCAYAAADqzRqJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA3SURBVHgB7cAxAQAQFEXRJ4MIMkjwS9hklMCoi1EBWljePWlHvQIAMy2mAMDNKV3ADysPAYCbB6fxBrzkZ2KOAAAAAElFTkSuQmCC" />
      <div class="summary-vertical-line"></div>
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

    summary += self.generate_device_summary_label('Manufacturer',manufacturer)
    summary += self.generate_device_summary_label('Model',model)
    summary += self.generate_device_summary_label('Firmware',fw)
    summary += self.generate_device_summary_label(
      'MAC Address',
      mac,
      trailing_space=False)

    # Add device configuration
    summary += '''
    <div class="summary-device-modules">
      <div class="summary-item-label" style="margin-bottom:10px;">
        Device Configuration
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

  def generate_result_summary(self,json_data):
    if json_data['status'] == 'Compliant':
      result_summary = '''<div class ="summary-color-box
      summary-box-compliant">'''
    else:
      result_summary = '''<div class ="summary-color-box
      summary-box-non-compliant">'''
    result_summary += self.generate_result_summary_item('Test status',
                                                        'Complete')
    result_summary += self.generate_result_summary_item(
      'Test result',json_data['status'],
      style='color: white; font-size:24px; font-weight: 700;')
    result_summary += self.generate_result_summary_item('Started',
                                                        json_data['started'])

    # Convert the timestamp strings to datetime objects
    start_time = datetime.strptime(json_data['started'], '%Y-%m-%d %H:%M:%S')
    end_time = datetime.strptime(json_data['finished'], '%Y-%m-%d %H:%M:%S')
    # Calculate the duration
    duration = end_time - start_time
    result_summary += self.generate_result_summary_item(
      'Duration',
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
    <div class="summary-item-label">{key}</div>
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

    .header-text {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 400;
    }

    .header-title {
      margin: 0px;
      font-size: 48px;
      font-weight: 700;
    }

    /* Define the summary related css elements*/
    .summary-content {
      position: relative;
      width: var(--summary-width);
      height: var(--summary-height);
      margin-top: 19px;
      margin-bottom: 19px;
    }

    .summary-item-label {
      position: relative;
      font-size: 12px;
      font-weight: 500;
      color: #5F6368;
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
      top: .3in;
      width: 2.6in;
      height: 226px;
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
      left: 10px;
      font-weight: 500;
    }

    .summary-box-value {
      font-size: 18px;
      margin: 0 0 10px 0;
      color: #ffffff;
      position: relative;
      top: 10px;
      left: 10px;
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
    }

    .footer-label {
      position: absolute;
      top: 20px;
      font-size: 12px;
    }

    @media print {
      @page {
        size: Letter;
        width: 8.5in;
        height: 11in;
      }
    }'''