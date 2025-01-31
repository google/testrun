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
"""Stores additional information about a device's risk"""
from datetime import datetime
from dateutil.relativedelta import relativedelta
from weasyprint import HTML
from io import BytesIO
import base64
from common import logger
import json
import os
from jinja2 import Template
from copy import deepcopy
import math

PROFILES_PATH = 'local/risk_profiles'
LOGGER = logger.get_logger('risk_profile')
RESOURCES_DIR = 'resources/report'
TEMPLATE_FILE = 'risk_report_template.html'
TEMPLATE_STYLES = 'risk_report_styles.css'
DEVICE_FORMAT_PATH = 'resources/devices/device_profile.json'

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))

# Locate the test-run root directory, 4 levels, src->python->framework->test-run
root_dir = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))

# Obtain the report resources directory
report_resource_dir = os.path.join(root_dir, RESOURCES_DIR)

test_run_img_file = os.path.join(report_resource_dir, 'testrun.png')


class RiskProfile():
  """Python representation of a risk profile"""

  def __init__(self, profile_json=None, profile_format=None):

    # Jinja template
    with open(os.path.join(report_resource_dir, TEMPLATE_FILE),
                            'r',
                            encoding='UTF-8'
                            ) as template_file:
      self._template = Template(template_file.read())
    with open(os.path.join(report_resource_dir,
                           TEMPLATE_STYLES),
                           'r',
                           encoding='UTF-8'
                           ) as style_file:
      self._template_styles = style_file.read()

    # Device profile format
    self._device_format = []
    try:
      with open(os.path.join(root_dir, DEVICE_FORMAT_PATH),
                'r',
                encoding='utf-8') as device_format_file:
        device_format_json = json.load(device_format_file)
        self._device_format = device_format_json
    except (IOError, ValueError) as e:
      LOGGER.error(
          'An error occurred whilst loading the device profile format')
      LOGGER.debug(e)


    if profile_json is None or profile_format is None:
      return

    self.name = profile_json['name']
    self.created = datetime.now()
    self.version = profile_json['version']
    self.questions = profile_json['questions']
    self.status = None
    self.risk = None
    self._device = None
    self._profile_format = profile_format

    self._validate(profile_json, profile_format)
    self.update_risk(profile_format)

  # Load a profile without modifying the created date
  # but still validate the profile
  def load(self, profile_json, profile_format):
    self.name = profile_json['name']
    self.created = datetime.strptime(
      profile_json['created'], '%Y-%m-%d')
    self.version = profile_json['version']
    self.questions = profile_json['questions']
    self.status = None
    self._profile_format = profile_format

    self._validate(profile_json, profile_format)
    self.update_risk(profile_format)

    return self

  def update(self, profile_json, profile_format):

    # Construct a new profile from json data
    new_profile = RiskProfile(profile_json, profile_format)

    # Check if name has changed
    self.name = profile_json[
        'rename'] if 'rename' in profile_json else profile_json['name']

    # Update this profile with newly created profile data
    self.version = new_profile.version
    self.created = new_profile.created
    self.questions = new_profile.questions
    self.status = new_profile.status

    self.risk = new_profile.risk

  def get_file_path(self):
    """Returns the file path for the current risk profile json"""
    return os.path.join(PROFILES_PATH,
                        self.name + '.json')

  def _validate(self, profile_json, profile_format):
    if self._expired():
      self.status = 'Expired'
    elif self._valid(profile_json, profile_format):
      # User only wants to save a draft
      if 'status' in profile_json and profile_json['status'] == 'Draft':
        self.status = 'Draft'
      else:
        self.status = 'Valid'
    else:
      self.status = 'Draft'

  def update_risk(self, profile_format):
    """Update the calculated risk for the risk profile"""

    if self.status == 'Valid':

      # Default risk = Limited
      risk = 'Limited'

      # Check each question in profile
      for question in self.questions:
        question_text = question['question']

        # Fetch the risk levels from the profile format
        format_q = self._get_format_question(
          question_text, profile_format)

        if format_q is None:
          # This occurs when a question found in a current profile
          # has been removed from the format (format change)
          continue

        # We only want to check the select or select-multiple
        # questions for now
        if format_q['type'] in ['select', 'select-multiple']:

          answer = question['answer']
          question_risk = 'Limited'

          # The answer is a single string (select)
          if isinstance(answer, str):

            format_option = self._get_format_question_option(
              format_q, answer)

            # Format options may just be a list of strings with
            # no risk attached
            if format_option is None:
              continue

            if 'risk' in format_option and format_option['risk'] == 'High':
              question_risk = format_option['risk']

          # A list of indexes is the answer (select-multiple)
          elif isinstance(answer, list):

            format_options = format_q['options']

            for index in answer:
              option = self._get_option_from_index(format_options, index)

              if option is None:
                LOGGER.error('Answer had an invalid index for question: ' +
                             format_q['question'])
                continue

              if 'risk' in option and option['risk'] == 'High':
                question_risk = 'High'

          question['risk'] = question_risk

      for question in self.questions:
        if 'risk' in question and question['risk'] == 'High':
          risk = 'High'

    else:
      # Remove risk
      risk = None

    self.risk = risk

  def _update_risk_by_device(self):
    risk = self.risk
    if self._device and self.status == 'Valid':
      for question in self._device.additional_info:
        if 'risk' in question and question['risk'] == 'High':
          risk = 'High'
          break
    return risk

  def _get_format_question(self, question: str, profile_format: dict):

    for q in profile_format:
      if q['question'] == question:
        return q
    return None

  def _get_option_from_index(self, options: list, index: int):
    i = 0
    for option in options:
      if i == index:
        return option
      i+=1
    return None

  def _check_answer(self, question):
    status = 'Limited'
    if question['validation']['required']:
      answer = question['answer']
      if question['type'] == 'select-multiple':
        if len(answer) > 0:
          status = 'High'
      elif question['type'] == 'select':
        if answer:
          status = 'High'
    return status

  def _get_profile_question(self, profile_json, question):

    for q in profile_json['questions']:
      if question.lower() == q['question'].lower():
        return q

    return None

  def _get_format_question_option(self, question_obj, answer):

    for option in question_obj['options']:

      # Ignore just string lists
      if isinstance(option, str):
        continue

      if option['text'] == answer:
        return option

    return None

  def _valid(self, profile_json, profile_format):

    # Check name field is present
    if 'name' not in profile_json:
      return False

    # Check questions field is present
    if 'questions' not in profile_json:
      return False

    all_questions_answered = True
    all_questions_present = True
    # Check all questions are present with answers
    for format_question in profile_format:
      # Check question is present
      profile_question = self._get_profile_question(profile_json,
                                                    format_question['question'])
      try:
        required = format_question['validation']['required']
      except KeyError:
        required = False
      if profile_question is not None and required:
        # Check answer is present
        if 'answer' not in profile_question:
          LOGGER.error('Missing answer for question: ' +
                       profile_question.get('question'))
          all_questions_answered = False

        answer = profile_question.get('answer')

        # Check if a multi-select answer has been completed
        if isinstance(answer, list):
          if len(answer) == 0:
            all_questions_answered = False

        # Check if string answer has a length greater than 0
        elif isinstance(answer, str):
          if required and len(answer) == 0:
            all_questions_answered = False

      elif required:
        LOGGER.error('Missing question: ' + format_question.get('question'))
        all_questions_present = False

    return all_questions_answered and all_questions_present

  def _expired(self):
    # Calculate the date one year after the creation date
    expiry_date = self.created + relativedelta(years=1)

    # Normalize the current date and time to midnight
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Check if the current date and time is past the expiry date
    return today > expiry_date

  def to_json(self, pretty=False):
    """Returns the current risk profile in JSON format"""
    json_dict = {
        'name': self.name,
        'version': self.version,
        'created': self.created.strftime('%Y-%m-%d'),
        'status': self.status,
        'risk': self.risk,
        'questions': self.questions
    }
    indent = 2 if pretty else None
    return json.dumps(json_dict, indent=indent)

  def to_html(self, device):
    """Returns the current risk profile in HTML format"""

    high_risk_message = '''The device has been assessed to be high
                               risk due to the nature of the answers provided
                                 about the device functionality.'''
    limited_risk_message = '''The device has been assessed to be limited risk
                               due to the nature of the answers provided about
                                 the device functionality.'''
    with open(test_run_img_file, 'rb') as f:
      logo_img_b64 = base64.b64encode(f.read()).decode('utf-8')

    self._device = self._format_device_profile(device)
    pages = self._generate_report_pages(device)
    return self._template.render(
                                styles=self._template_styles,
                                manufacturer=self._device.manufacturer,
                                model=self._device.model,
                                logo=logo_img_b64,
                                risk=self._update_risk_by_device(),
                                high_risk_message=high_risk_message,
                                limited_risk_message=limited_risk_message,
                                pages=pages,
                                total_pages=len(pages),
                                version=self.version,
                                created_at=self.created.strftime('%d.%m.%Y')
                                )

  def to_html_no_device(self):
    """Returns the risk profile in HTML format without device info"""

    high_risk_message = '''The device has been assessed to be high
                               risk due to the nature of the answers provided
                                 about the device functionality.'''
    limited_risk_message = '''The device has been assessed to be limited risk
                               due to the nature of the answers provided about
                                 the device functionality.'''

    with open(test_run_img_file, 'rb') as f:
      logo_img_b64 = base64.b64encode(f.read()).decode('utf-8')

    pages = self._generate_report_pages()
    return self._template.render(
                                styles=self._template_styles,
                                logo=logo_img_b64,
                                risk=self.risk,
                                high_risk_message=high_risk_message,
                                limited_risk_message=limited_risk_message,
                                pages=pages,
                                total_pages=len(pages),
                                version=self.version,
                                created_at=self.created.strftime('%d.%m.%Y')
                                )

  def _generate_report_pages(self, device=None):

    # Text block heght
    block_height = 18
    # Table row padding
    block_padding = 30
    # Margin bottom list answer
    margin_list = 14
    # margin after table row
    margin_row = 8

    height_first_page = 760
    height_page = 980

    # Average text block width in characters
    # for a 14px font size (average width of one character is 8px).
    letters_in_line_str = 38
    letters_in_line_q = 40
    letters_in_line_list = 36

    height = 0
    pages = []
    current_page = []
    index = 1

    questions = deepcopy(self.questions)

    if device:
      questions = deepcopy(self._device.additional_info)
      questions.extend(self.questions)

    for question in questions:

      page_item = deepcopy(question)
      answer_height = 0

      # Question height calculation
      question_height = math.ceil(len(page_item['question'])
                                   / letters_in_line_q
                                   ) * block_height
      question_height += block_padding + margin_row
      if isinstance(page_item['answer'], str):
        # Answer height for string
        answer_height = math.ceil(len(page_item['answer'])
                                   / letters_in_line_str
                                   ) * block_height
        answer_height += block_padding + margin_row
      else:
        text_answers = []
        options = self._get_format_question(
          question=page_item['question'],
          profile_format=self._profile_format)['options']
        options_dict = dict(enumerate(options))
        for answer_index in page_item['answer']:
          height += 40
          text_answers.append(options_dict[answer_index]['text'])
        page_item['answer'] = text_answers
        # Answer height for list
        for answer in options:
          answer_height += math.ceil(len(answer)
                                     / letters_in_line_list
                                     ) * block_height
        answer_height += block_padding + margin_row + margin_list
      page_item['index'] = index
      row_height = max(question_height, answer_height)

      if (
        (len(pages) == 0 and row_height + height > height_first_page)
        or (len(pages) > 0 and row_height + height > height_page)
        ):
        pages.append(current_page)
        height = 0
        current_page = [page_item]
      else:
        height += row_height
        current_page.append(page_item)
      index += 1
    pages.append(current_page)

    return pages


  def to_pdf(self, device):
    """Returns the current risk profile in PDF format"""

    # Resolve the data as html first
    html = self.to_html(device)

    # Convert HTML to PDF in memory using weasyprint
    pdf_bytes = BytesIO()
    HTML(string=html).write_pdf(pdf_bytes)
    return pdf_bytes

  def to_pdf_no_device(self):
    """Returns the risk profile in PDF format without device info"""

    # Resolve the data as html first
    html = self.to_html_no_device()

    # Convert HTML to PDF in memory using weasyprint
    pdf_bytes = BytesIO()
    HTML(string=html).write_pdf(pdf_bytes)
    return pdf_bytes

  # Adding risks to device profile questions
  def _format_device_profile(self, device):
    device_copy = deepcopy(device)
    risk_map = {
      question['question']: {
          option['text']: option.get('risk', None)
          for option in question['options'] if 'risk' in option
      }
      for question in self._device_format
    }
    for question in device_copy.additional_info:
      risk = risk_map.get(
        question['question'], {}
        ).get(question['answer'], None)
      if risk:
        question['risk'] = risk
    return device_copy
