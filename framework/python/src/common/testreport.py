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
"""Store previous Testrun information."""

from datetime import datetime
from weasyprint import HTML
from io import BytesIO
from common import util
from common.statuses import TestrunStatus
import base64
import os
from test_orc.test_case import TestCase
from jinja2 import Environment, FileSystemLoader
from collections import OrderedDict
import re
from bs4 import BeautifulSoup


DATE_TIME_FORMAT = '%Y-%m-%d %H:%M:%S'
RESOURCES_DIR = 'resources/report'
TESTS_FIRST_PAGE = 11
TESTS_PER_PAGE = 20
TEST_REPORT_STYLES = 'test_report_styles.css'
TEST_REPORT_TEMPLATE = 'test_report_template.html'

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Locate the test-run root directory, 4 levels, src->python->framework->test-run
root_dir = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))

# Obtain the report resources directory
report_resource_dir = os.path.join(root_dir, RESOURCES_DIR)

test_run_img_file = os.path.join(report_resource_dir, 'testrun.png')
qualification_icon = os.path.join(report_resource_dir, 'qualification-icon.png')
pilot_icon = os.path.join(report_resource_dir, 'pilot-icon.png')


class TestReport():
  """Represents a previous Testrun report."""

  def __init__(self,
               status=TestrunStatus.NON_COMPLIANT,
               started=None,
               finished=None,
               total_tests=0):
    self._device = {}
    self._mac_addr = None
    self._status: str = status
    self._started = started
    self._finished = finished
    self._total_tests = total_tests
    self._results = []
    self._module_reports = []
    self._report_url = ''
    self._cur_page = 0

  def update_device_profile(self, additional_info):
    self._device['device_profile'] = additional_info

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

  def set_mac_addr(self, mac_addr):
    self._mac_addr = mac_addr

  def to_json(self):
    report_json = {}

    report_json['testrun'] = {
      'version': self._version
    }

    report_json['mac_addr'] = self._mac_addr
    report_json['device'] = self._device
    report_json['status'] = self._status
    report_json['started'] = self._started.strftime(DATE_TIME_FORMAT)
    report_json['finished'] = self._finished.strftime(DATE_TIME_FORMAT)

    test_results = []
    for test in self._results:
      test_dict = {
        'name': test.name,
        'description': test.description,
        'expected_behavior': test.expected_behavior,
        'required_result': test.required_result,
        'result': test.result
      }

      if test.recommendations is not None and len(test.recommendations) > 0:
        test_dict['recommendations'] = test.recommendations

      if (test.optional_recommendations is not None
        and len(test.optional_recommendations) > 0):
        test_dict['optional_recommendations'] = test.optional_recommendations

      test_results.append(test_dict)

    report_json['tests'] = {'total': self._total_tests,
                            'results': test_results}
    report_json['report'] = self._report_url
    return report_json

  def from_json(self, json_file):

    # Version added in v1.3-alpha
    if 'testrun' in json_file and 'version' in json_file['testrun']:
      self._version = json_file['testrun']['version']
    else:
      self._version = 'Unknown'

    self._device['mac_addr'] = json_file['device']['mac_addr']
    self._device['manufacturer'] = json_file['device']['manufacturer']
    self._device['model'] = json_file['device']['model']

    # Firmware is not specified for non-UI devices
    if 'firmware' in json_file['device']:
      self._device['firmware'] = json_file['device']['firmware']

    if 'test_modules' in json_file['device']:
      self._device['test_modules'] = json_file['device']['test_modules']

    if 'test_pack' in json_file['device']:
      self._device['test_pack'] = json_file['device']['test_pack']

    if 'additional_info' in json_file['device']:
      self._device['device_profile'] = json_file['device']['additional_info']

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

      # Add test recommendations
      if 'recommendations' in test_result:
        test_case.recommendations = test_result['recommendations']

      # Add optional test recommendations
      if 'optional_recommendations' in test_result:
        test_case.optional_recommendations = test_result[
          'optional_recommendations']

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

    # Jinja template
    template_env = Environment(loader=FileSystemLoader(report_resource_dir))
    template = template_env.get_template(TEST_REPORT_TEMPLATE)
    with open(os.path.join(report_resource_dir,
                           TEST_REPORT_STYLES),
                           'r',
                           encoding='UTF-8'
                           ) as style_file:
      styles = style_file.read()

    # Load Testrun logo to base64
    with open(test_run_img_file, 'rb') as f:
      logo = base64.b64encode(f.read()).decode('utf-8')

    json_data=self.to_json()

    # Icons
    with open(qualification_icon, 'rb') as f:
      icon_qualification = base64.b64encode(f.read()).decode('utf-8')
    with open(pilot_icon, 'rb') as f:
      icon_pilot = base64.b64encode(f.read()).decode('utf-8')

    # Convert the timestamp strings to datetime objects
    start_time = datetime.strptime(json_data['started'], '%Y-%m-%d %H:%M:%S')
    end_time = datetime.strptime(json_data['finished'], '%Y-%m-%d %H:%M:%S')

    # Calculate the duration
    duration = end_time - start_time

    # Calculate number of successful tests
    successful_tests = 0
    for test in json_data['tests']['results']:
      if test['result'] != 'Error':
        successful_tests += 1

    # Obtain the steps to resolve
    steps_to_resolve = self._get_steps_to_resolve(json_data)

    # Obtain optional recommendations
    optional_steps_to_resolve = self._get_optional_steps_to_resolve(json_data)

    module_reports = self._get_module_pages()
    pages_num = self._pages_num(json_data)
    total_pages = pages_num + len(module_reports) + 1
    if len(steps_to_resolve) > 0:
      total_pages += 1
    if (len(optional_steps_to_resolve) > 0
        and json_data['device']['test_pack'] == 'Pilot Assessment'
        ):
      total_pages += len(optional_steps_to_resolve)

    is_pilot = json_data['device']['test_pack'] == 'Pilot Assessment'
    return template.render(styles=styles,
                           logo=logo,
                           icon_qualification=icon_qualification,
                           icon_pilot=icon_pilot,
                           version=self._version,
                           json_data=json_data,
                           device=json_data['device'],
                           modules=self._device_modules(json_data['device']),
                           test_status=json_data['status'],
                           duration=duration,
                           successful_tests=successful_tests,
                           total_tests=self._total_tests,
                           test_results=json_data['tests']['results'],
                           steps_to_resolve=steps_to_resolve,
                           optional_steps_to_resolve=optional_steps_to_resolve,
                           module_reports=module_reports,
                           pages_num=pages_num,
                           total_pages=total_pages,
                           tests_first_page=TESTS_FIRST_PAGE,
                           tests_per_page=TESTS_PER_PAGE,
                           is_pilot = is_pilot,
                           )

  def _pages_num(self, json_data):

    # Calculate pages
    test_count = len(json_data['tests']['results'])

    # Multiple pages required
    if test_count > TESTS_FIRST_PAGE:
      # First page
      pages = 1

      # Remaining testsgenerate
      test_count -= TESTS_FIRST_PAGE
      pages += (int)(test_count / TESTS_PER_PAGE)
      pages = pages + 1 if test_count % TESTS_PER_PAGE > 0 else pages

    # 1 page required
    else:
      pages = 1

    return pages

  def _device_modules(self, device):
    sorted_modules = {}

    if 'test_modules' in device:

      for test_module in device['test_modules']:
        if 'enabled' in device['test_modules'][test_module]:
          sorted_modules[
            util.get_module_display_name(test_module)] = device['test_modules'][
            test_module]['enabled']

      # Sort the modules by enabled first
      sorted_modules = OrderedDict(sorted(sorted_modules.items(),
                                          key=lambda x:x[1],
                                          reverse=True)
                                  )
    return sorted_modules

  def _get_steps_to_resolve(self, json_data):
    tests_with_recommendations = []

    # Collect all tests with recommendations
    for test in json_data['tests']['results']:
      if 'recommendations' in test:
        tests_with_recommendations.append(test)

    return tests_with_recommendations

  def _get_optional_steps_to_resolve(self, json_data):
    tests_with_recommendations = []

    # Collect all tests with recommendations
    for test in json_data['tests']['results']:
      if 'optional_recommendations' in test:
        tests_with_recommendations.append(test)

    return self._split_steps_to_resolve_to_pages(tests_with_recommendations)

  def _split_steps_to_resolve_to_pages(self, steps):
    # Split steps to resolve to pages.
    # First page 3 steps, 4 steps on other pages.
    if len(steps) < 3:
      return [steps]

    splitted = [steps[:3]]

    index = 3
    while index < len(steps):
      splitted.append(steps[index:index + 4])
      index += 4

    return splitted


  def _split_module_report_to_pages(self, reports):
    """Split report to pages by headers"""
    reports_transformed = []

    for report in reports:
      if len(re.findall('<table class="module-summary"', report)) > 1:
        indices = []
        index = report.find('<table class="module-summary"')
        while index != -1:
          indices.append(index)
          index = report.find('<table class="module-summary"', index + 1)
        pos = 0
        for i in indices[1:]:
          page = report[pos:i].replace(
            '"module-summary"', '"module-summary not-first"'
            )
          reports_transformed.append(page)
          pos = i
        page = report[pos:].replace(
          '"module-summary"', '"module-summary not-first"'
          )
        reports_transformed.append(page)
      else:
        reports_transformed.append(report)

    return reports_transformed


  def _get_module_pages(self):
    content_max_size = 913

    reports = []

    module_reports = self._split_module_report_to_pages(self._module_reports)

    for module_report in module_reports:
      # ToDo: Figure out how to make this dynamic
      # Padding values  from CSS
      # Element sizes from inspection of rendered report
      h1_padding = 8
      module_summary_padding = 50 # 25 top and 25 bottom

      # Reset values for each module report
      page_content = ''
      content_size = 0

      # Convert module report to list of html tags
      soup = BeautifulSoup(module_report, features='html5lib')
      children = list(
                      filter(lambda el: el.name is not None, soup.body.children)
                      )

      for index, el in enumerate(children):
        current_size = 0
        if el.name == 'h1':
          current_size += 40 + h1_padding
        # Calculating the height of paired tables
        elif (el.name == 'div'
              and el.get('id') == 'tls_table'):
          tables = el.findChildren('table', recursive=True)
          current_size = max(
                            map(lambda t: len(
                              t.findChildren('tr', recursive=True)
                              ), tables)
                            ) * 42
        # Table height
        elif el.name == 'table':
          if el['class'] == 'module-summary':
            current_size = 85 + module_summary_padding
          else:
            current_size = len(el.findChildren('tr', recursive=True)) * 42
        # Other elements height
        else:
          current_size = 50
        # Moving tables to the next page.
        # Completely transfer tables that are within the maximum
        # allowable size, while splitting those that exceed the page size.
        if (content_size + current_size) >= content_max_size:
          str_el = ''
          if current_size > (content_max_size - 85 - module_summary_padding):
            rows = el.findChildren('tr', recursive=True)
            table_header = str(rows.pop(0))
            table_1 = table_2 = f'''
                            <table class="module-data" style="width:100%">
                            <thead>{table_header}</thead><tbody>'''
            rows_count = (content_max_size - 85 - module_summary_padding) // 42
            table_1 += ''.join(map(str, rows[:rows_count-1]))
            table_1 += '</tbody></table>'
            table_2 += ''.join(map(str, rows[rows_count-1:]))
            table_2 += '</tbody></table>'
            page_content += table_1
            reports.append(page_content)
            page_content = table_2
            current_size = len(rows[rows_count:]) * 42
          else:
            if el.name == 'table':
              el_header = children[index-1]
              if el_header.name.startswith('h'):
                page_content = ''.join(page_content.rsplit(str(el_header), 1))
                str_el = str(el_header) + str(el)
                content_size = current_size + 50
              else:
                str_el = str(el)
                content_size = current_size
            reports.append(page_content)
            page_content = str_el
        else:
          page_content += str(el)
          content_size += current_size
      reports.append(page_content)
    return reports
