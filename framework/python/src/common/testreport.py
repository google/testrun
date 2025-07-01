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
from common import util, logger
from common.statuses import TestrunStatus, TestrunResult
from test_orc import test_pack
import base64
import os
from test_orc.test_case import TestCase
from jinja2 import Environment, FileSystemLoader, BaseLoader
from collections import OrderedDict
from bs4 import BeautifulSoup
import math


DATE_TIME_FORMAT = '%Y-%m-%d %H:%M:%S'
RESOURCES_DIR = 'resources/report'
TESTS_FIRST_PAGE = 11
TESTS_PER_PAGE = 20
TEST_REPORT_STYLES = 'test_report_styles.css'
TEMPLATES_FOLDER = 'report_templates'
TEST_REPORT_TEMPLATE = 'report_template.html'
ICON = 'icon.png'
RESULTS_SPACE_FIRST_PAGE = 440
RESULTS_SPACE = 800


LOGGER = logger.get_logger('REPORT')

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
               result=TestrunResult.NON_COMPLIANT,
               started=None,
               finished=None,
               total_tests=0):
    self._device = {}
    self._mac_addr = None
    self._status: TestrunStatus = TestrunStatus.COMPLETE
    self._result: TestrunResult = result
    self._started = started
    self._finished = finished
    self._total_tests = total_tests
    self._results = []
    self._module_reports = []
    self._module_templates = []
    self._report_url = ''
    self._export_url = ''
    self._cur_page = 0

  def update_device_profile(self, additional_info):
    self._device['device_profile'] = additional_info

  def add_module_reports(self, module_reports):
    self._module_reports = module_reports

  def add_module_templates(self, module_templates):
    self._module_templates = module_templates

  def get_status(self):
    return self._status

  def get_result(self):
    return self._result

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

  def get_export_url(self):
    return self._export_url

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
    report_json['result'] = self._result
    report_json['started'] = self._started.strftime(DATE_TIME_FORMAT)
    report_json['finished'] = self._finished.strftime(DATE_TIME_FORMAT)

    test_results = []
    for test in self._results:
      details = test.details
      if isinstance(details, str):
        details = list(filter(lambda s: s!='', details.split('\n')))
      test_dict = {
        'name': test.name,
        'description': test.description,
        'expected_behavior': test.expected_behavior,
        'required_result': test.required_result,
        'result': test.result,
        'details': details
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

    # Used for regenerating the report since after initial report creation the
    # 'additional_info' field is changed to 'device_profile' in the report
    if 'device_profile' in json_file['device']:
      self._device['device_profile'] = json_file['device']['device_profile']

    self._status = json_file['status']

    if 'result' in json_file:
      self._result = json_file['result']

    self._started = datetime.strptime(json_file['started'], DATE_TIME_FORMAT)
    self._finished = datetime.strptime(json_file['finished'], DATE_TIME_FORMAT)

    if 'report' in json_file:
      self._report_url = json_file['report']
    if 'export' in json_file:
      self._export_url = json_file['export']

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
      if 'details' in test_result:
        test_case.details = test_result['details']

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

    # Obtain test pack
    current_test_pack = test_pack.TestPack.get_test_pack(
      self._device['test_pack'])
    template_folder = os.path.join(current_test_pack.path,
                                  TEMPLATES_FOLDER)
    # Jinja template
    template_env = Environment(
                                loader=FileSystemLoader(
                                              template_folder
                                              ),
                                trim_blocks=True,
                                lstrip_blocks=True
                              )
    template = template_env.get_template(TEST_REPORT_TEMPLATE)

    # Report styles
    with open(os.path.join(report_resource_dir,
                           TEST_REPORT_STYLES),
                           'r',
                           encoding='UTF-8'
                           ) as style_file:
      styles = style_file.read()

    # Load Testrun logo to base64
    with open(test_run_img_file, 'rb') as f:
      logo = base64.b64encode(f.read()).decode('utf-8')

    # Icon
    with open(os.path.join(template_folder, ICON), 'rb') as f:
      icon = base64.b64encode(f.read()).decode('utf-8')

    json_data=self.to_json()

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
    logic = current_test_pack.get_logic()
    steps_to_resolve_ = logic.get_steps_to_resolve(json_data)

    module_reports = self._module_reports
    env_module = Environment(loader=BaseLoader())
    manufacturer_length = len(json_data['device']['manufacturer'])
    device_name_length = len(json_data['device']['model'])
    title_length = manufacturer_length + device_name_length + 1
    results = json_data['tests']['results']
    results_pages = self._generate_result_pages(title_length, results)

    module_templates = [
        env_module.from_string(s).render(
          name=current_test_pack.name,
          device=json_data['device'],
          logo=logo,
          icon=icon,
          version=self._version,
      ) for s in self._module_templates
    ]

    return self._add_page_counter(template.render(styles=styles,
                           logo=logo,
                           icon=icon,
                           version=self._version,
                           json_data=json_data,
                           device=json_data['device'],
                           modules=self._device_modules(json_data['device']),
                           results_pages = results_pages,
                           test_status=json_data['status'],
                           duration=duration,
                           successful_tests=successful_tests,
                           total_tests=self._total_tests,
                           test_results=json_data['tests']['results'],
                           steps_to_resolve=steps_to_resolve_,
                           module_reports=module_reports,
                           tests_per_page=TESTS_PER_PAGE,
                           module_templates=module_templates
                           ))

  def _calculate_space_first_page(self, title_length):
    # Calculation of test results lines at first page
    # Average chars per line is 25
    estimated_lines = title_length // 25
    if title_length % 25 > 0:
      estimated_lines += 1
    if estimated_lines > 1:
      # Line height is 60 px
      title_px = (estimated_lines - 1) * 60
      return RESULTS_SPACE_FIRST_PAGE - title_px
    else:
      return RESULTS_SPACE_FIRST_PAGE

  def _add_page_counter(self, html):
    # Add page nums and total page
    soup = BeautifulSoup(html, features='html5lib')
    page_index_divs = soup.find_all('div', class_='page-index')
    total_pages = len(page_index_divs)
    for index, div in enumerate(page_index_divs):
      div.string = f'Page {index+1}/{total_pages}'
    return str(soup)

  def _calc_details_height(self, text):
    # Calculate a details line height
    lines = math.ceil(len(text) / 100)
    return (lines * 14) + 12

  def _gen_result_page(self, results, space):
    # Build results page content
    page = []
    page_space = 0
    while results:
      result = results[0]
      line_height = 40
      if result['details']:
        line_height += self._calc_details_height(result['details'])
      page_space += line_height
      if page_space > space:
        break
      else:
        page.append(results.pop(0))
    return page

  def _generate_result_pages(self, title_length,  results):
    # Generating pages with tests results
    pages = []
    pages.append(
      self._gen_result_page(results,
                            self._calculate_space_first_page(title_length))
                )
    while results:
      pages.append(self._gen_result_page(results, RESULTS_SPACE))
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
