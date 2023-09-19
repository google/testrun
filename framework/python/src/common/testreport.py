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
import json 
import base64
import os

DATE_TIME_FORMAT = '%Y-%m-%d %H:%M:%S'
RESOURCES_DIR = 'resources/report'

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Locate the test-run root directory, 4 levels, src->python->framework->test-run
root_dir = os.path.dirname(os.path.dirname(
  os.path.dirname(os.path.dirname(current_dir))))

# Obtain the report resources directory
report_resource_dir = os.path.join(root_dir,
                                    RESOURCES_DIR)

font_file = os.path.join(report_resource_dir,'GoogleSans-Regular.ttf')
test_run_img_file = os.path.join(report_resource_dir,'testrun.png')

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
    {self.generate_head()}
    <body>
      {self.generate_body(json_data)}
    </body>
    </html>
    '''

  def generate_test_sections(self,json_data):
    results = json_data["tests"]["results"]
    sections = ""
    for result in results:
        sections += self.generate_test_section(result)
    return sections

  def generate_test_section(self, result):
    section_content = '<section class="test-section">\n'
    for key, value in result.items():
        if value is not None:  # Check if the value is not None
            formatted_key = key.replace('_', ' ').title()  # Replace underscores and capitalize
            section_content += f'<p><strong>{formatted_key}:</strong> {value}</p>\n'
    section_content += '</section>\n<div style="margin-bottom: 40px;"></div>\n'
    return section_content

  def generate_pages(self,json_data):
    max_page = 1
    reports_per_page = 25 # figure out how many can fit on other pages

    # Calculate pages
    test_count = len(json_data['tests']['results'])

    # 16 tests can fit on the first page
    if test_count > 16:
      test_count -= 16
      
      full_page = (int)(test_count / reports_per_page)
      partial_page = 1 if test_count % reports_per_page > 0 else 0
      if partial_page > 0:
        max_page += full_page + partial_page

    pages = ''
    for i in range(max_page):
      pages += self.generate_page(json_data, i+1, max_page)
    return pages


  def generate_page(self,json_data, page_num, max_page):
    version = 'v1.2 (2023-07-27)' # Place holder until available in json report
    page = '<div class="page">'
    page += self.generate_header(json_data)
    if page_num == 1:
      page += self.generate_summary(json_data)
    page += self.generate_results(json_data, page_num)
    page += self.generate_footer(page_num,max_page,version)
    page += '</div>'
    if page_num < max_page:
      page += '<div style="break-after:page"></div>'
      #page += f'''<p style="page-break-before: always"></p>'''
    return page

  def generate_body(self,json_data, page_num=1, max_page=1):
    return f'''
    <body>
      {self.generate_pages(json_data)}
    </body>
    '''

  def generate_footer(self,page_num, max_page, version):
    footer = f'''
    <div class="footer">
      <span class="gradient-line"></span>
        <div class="footer-label">Testrun {version}</div>
        <div class="footer-label" style="right: 0px">page {page_num}/{max_page}</div>
    </div>
    '''
    return footer

  def generate_results(self,json_data, page_num):

    result_list = f'''
      <div class="result-list" style="font-weight: bold;">Results List
        <div class="result-line" style="margin-top: 10px">
          <div class="result-list-header-label" style="left: .1in">Name</div>
          <div class="result-list-header-label" style="left: 3.2in">Description</div>
          <div class="result-list-header-label" style="left: 6.5in">Result</div>
        </div>'''
    if page_num == 1:
      start = 0
    else:
      start = 16 * (page_num - 1) + (page_num-2) * 25
    results_on_page = 16 if page_num == 1 else 25
    result_end = min(results_on_page,len(json_data['tests']['results']))
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
          <div class="result-test-label" style="left: 3.2in;">{result['test_description']}</div>
          <div class="result-test-label {result_class}" style="left: 6.5in;">{result['result']}</div>
      </div>
      '''
    return result_html


  def generate_header(self, json_data):
    with open(test_run_img_file, 'rb') as f:
      tr_img_b64 = base64.b64encode(f.read()).decode('utf-8')
    return f'''
    <div class="header">
      <h3 class="header-text">Testrun report</h3>
      <h1 class="header-text" style="top: 50%;">{json_data["device"]["manufacturer"]} {json_data["device"]["model"]}</h1>
      <img src="data:image/png;base64,{tr_img_b64}" alt="Test Run" width="90" style="position: absolute;top: 40%; right: 0px;"></img>
    </div>
    '''

  def generate_summary(self, json_data):
    # Generate the basic content section layout
    summary =  f'''
     <div class="summary-content" style="margin-top:19px;">
      <span class="gradient-line" style="top: 0px;"></span>
      <span class="gradient-line" style="position: absolute; bottom:0px;"></span>
      <div class="summary-vertical-line"></div>
      <div style="margin-top: 19px"></div>
     '''
    # Add the device information
    manufacturer = json_data['device']['manufacturer'] if 'manufacturer' in json_data['device']  else 'Undefined'
    model = json_data['device']['model'] if 'model' in json_data['device']  else 'Undefined'
    fw = json_data['device']['firmware'] if 'firmware' in json_data['device']  else 'Undefined'
    mac = json_data['device']['mac_addr'] if 'mac_addr' in json_data['device']  else 'Undefined'
    
    summary += self.generate_device_summary_label('Manufacturer',manufacturer)
    summary += self.generate_device_summary_label('Model',model)
    summary += self.generate_device_summary_label('Firmware',fw)
    summary += self.generate_device_summary_label('MAC Address',mac,trailing_space=False)

    # Add the result summary
    summary += self.generate_result_summary(json_data)
    
    summary += '\n</div>'
    return summary

  def generate_result_summary(self,json_data):
    result_summary = '''<div class ="summary-color-box">'''
    result_summary += self.generate_result_summary_item('Test status','Complete')
    result_summary += self.generate_result_summary_item('Test result',json_data['status'], style="color: white; font-size:18px; font-weight: bold;")
    result_summary += self.generate_result_summary_item('Started',json_data['started'])

    # Convert the timestamp strings to datetime objects
    start_time = datetime.strptime(json_data['started'], "%Y-%m-%d %H:%M:%S")
    end_time = datetime.strptime(json_data['finished'], "%Y-%m-%d %H:%M:%S")
    # Calculate the duration
    duration = end_time - start_time
    result_summary += self.generate_result_summary_item('Duration',str(duration))
    
    result_summary += '\n</div>'
    return result_summary

  def generate_result_summary_item(self, key, value, style=None):
    summary_item = f'''<div class="summary-box-label">{key}</div>'''
    if style is not None:
      summary_item += f'''<div style="{style}" class="summary-box-value">{value}</div>'''
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
    with open(font_file, 'rb') as f:
      google_sans_b64 = base64.b64encode(f.read())

    css = '''
    /* Set some global variables */
    :root{
      --header-height: .75in;
      --header-width: 8.5in;
      --header-pos-x: 0in ;
      --header-pos-y: 0in;
      --summary-width: 8.5in;
      --summary-height: 2.1in;
      --vertical-line-heigth: calc(var(--summary-height)-.2in);
      --vertical-line-pos-x: 25%;
    }
    '''
    css += '''
    /* Import the GooglSans format */
    @font-face {
      font-family: 'GooglSans-Regular';
      '''
    css+= f'''src: url(data:font/ttf:base64, {google_sans_b64} format('truetype');}}'''

    css+='''
    /* Define some common body formatting*/
    body {
      font-family: 'GoogleSans-Regular', sans-serif;
      margin: 0px;
      padding: 0px;
      /*margin: 20px;
      width: 8.5in;
      height: 11in;*/
    }
    
    /* Use this for various section breaks*/
    .gradient-line {
      position: relative;
      background-image: linear-gradient(to right, red, blue, green, yellow, orange);
      height: 1px; /* Adjust the height as needed */
      width: 100%; /* To span the entire width */
      display: block; /* Ensures it's a block-level element */
    }

    /* Sets proper page size during print to pdf for weasyprint */
    @page{
      size: Letter;
      width: 8.5in;
      height: 11in;
    }

    .page{
      position: relative;
      margin: 0px 20px 0px 20px;
      width: 8.5in;
      height: 11in;
    }

    /* Define the  header related css elements*/
    .header {
      position: relative;
      width: var(--header-width);
      height:  var(--header-height);
      left: var(--header-pos-x);
      top: var(--header-pos-y);
    }
    .header-text{
      position: absolute;
      margin: 0px;
    }

    /* Define the summary related css elements*/
    .summary-content{
      position: relative;
      width: var(--summary-width);
      height: var(--summary-height);
    }
    .summary-item-label{
      position: relative;
      font-size: 11px;
    }
    .summary-item-value{
      position: relative;
      font-size: 15px;
      font-weight: bold;
    }
    .summary-item-space{
      position: relative;
      padding-bottom: 10px;
      margin: 0;
    }
    .summary-vertical-line {
      width: 1px; /* Adjust the width as needed */
      height: var(--vertical-line-heigth);
      background-color: #000;
      position: absolute;
      top: .1in;
      bottom: .1in;
      left: 3in;
    }

    /* CSS for the color box */
    .summary-color-box {
      position: absolute;
      right: 0in;
      top: .1in;
      width: 2.2in; /* Adjust the width as needed */
      height: 180px; /* Adjust the height as needed */
      background-color: rgb(24, 128, 56); /* RGB color (red) */
    }
    .summary-box-label{
      font-size: 11px;
      margin-top: 5px;
      color: rgba(255,255,255,0.7); /* White with 70% opacity */
      position: relative;
      top: 10px;
      left: 10px;
    }
    .summary-box-value{
      font-size: 12px;
      margin: 0px;
      color: rgba(255,255,255,0.9); /* White with 90% opacity */
      position: relative;
      top: 10px;
      left: 10px;
    }

    .result-list{
      position: relative;
      margin-top: .2in;
      font-size: 18px;  
    }
    .result-line{
      border: 1px solid #D3D3D3; /* Light Gray border*/
      height: .4in;
      width: 8.5in;
    }
    .result-line-result{
      border-top: 0px;
    }
    .result-list-header-label{
      font-weight: bold;
      position: absolute;
      font-size: 12px;
      font-weight: bold;
      height: 40px;
      display: flex;
      align-items: center;
    }
    .result-test-label {
      font-weight: normal;
      position: absolute;
      font-size: 12px;
      height: 40px;
      width: 300px;
      font-weight: normal;
      display: flex;
      align-items: center;
      text-overflow: ellipsis;
    }
    .result-test-result-non-compliant {
      position: absolute;
      font-size: 12px;
      font-weight: bold;
      width: 105px;
      height: 12px;
      margin-top: 14px;
      padding-left: 5px;
      padding-right: 5px;
      background-color: rgba(255, 0, 0, 0.2); /* Red with 20% opacity */
      color: red;
    }
    .result-test-result-compliant {
      position: absolute;
      font-size: 12px;
      font-weight: bold;
      width: 70px;
      height: 12px;
      margin-top: 14px;
      padding-left: 5px;
      padding-right: 5px;
      background-color: rgba(0, 255, 0, 0.2); /* Green with 20% opacity */
      color: green;
    }
    .result-test-result-skipped {
      position: absolute;
      font-size: 12px;
      font-weight: bold;
      width: 60px;
      height: 12px;
      margin-top: 14px;
      padding-left: 5px;
      padding-right: 5px;
      background-color: rgb(224,224,224); /* Red with 50% opacity */
      color: grey;
    }

    /* CSS for the footer */
    .footer{
      position: absolute;
      height: 20px;
      width: 8.5in;
      bottom: 0in;
    }
    .footer-label{
      position: absolute;
      top: 5px;
      font-size: 12px;
    }

    @media print {
      @page{
        size: Letter;
        width: 8.5in;
        height: 11in;
      }
    }
    '''
    return css
