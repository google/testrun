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

PROFILES_PATH = 'local/risk_profiles'
LOGGER = logger.get_logger('risk_profile')
RESOURCES_DIR = 'resources/report'

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

    self._device = device

    return f'''
    <!DOCTYPE html>
    <html lang="en">
      {self._generate_head()}
    <body>
      <div class="page">
        {self._generate_header()}
        {self._generate_risk_banner()}
        {self._generate_risk_questions()}
        {self._generate_footer()}
      </div>
    </body>
    </html>
    '''

  def _generate_head(self):

    return f'''
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Risk Assessment</title>
      <style>
        {self._generate_css()}
      </style>
    </head>
    '''

  def _generate_header(self):
    with open(test_run_img_file, 'rb') as f:
      tr_img_b64 = base64.b64encode(f.read()).decode('utf-8')
      header = f'''
        <div class="header" style="margin-bottom:1px solid #DADCE0">
          <h1>Risk assessment</h1>
          <h3 style="margin-top:0;max-width:700px">
            {self._device.manufacturer}
            {self._device.model}
          </h3>'''
    header += f'''<img src="data:image/png;base64,
      {tr_img_b64}" alt="Testrun" width="90" style="position: absolute;top: 40%; right: 0px;"></img>
    </div>
    '''
    return header

  def _generate_risk_banner(self):
    return f'''
      <div class="risk-banner risk-banner-{'high' if self.risk == 'High' else 'limited'}">
        <div class="risk-banner-title">
          <h3>{'high' if self.risk == 'High' else 'limited'} Risk</h3>
        </div>
        <div class="risk-banner-description">
          {
            'The device has been assessed to be high risk due to the nature of the answers provided about the device functionality.'
           if self.risk == 'High' else
           'The device has been assessed to be limited risk due to the nature of the answers provided about the device functionality.'
          }
        </div>
      </div>
    '''

  def _generate_risk_questions(self):

    max_page_height = 350
    content = ''

    content += self._generate_table_head()

    index = 1
    height = 0

    for question in self.questions:

      if height > max_page_height:
        content += self._generate_new_page()
        height = 0

      content += f'''
        <div class="risk-table-row">
          <div class="risk-question-no">{index}.</div>
          <div class="risk-question">{question['question']}</div>
          <div class="risk-answer">'''

      # String answers (one line)
      if isinstance(question['answer'], str):
        content += question['answer']

        if len(question['answer']) > 400:
          height += 160
        elif len(question['answer']) > 300:
          height += 140
        elif len(question['answer']) > 200:
          height += 120
        elif len(question['answer']) > 100:
          height += 70
        else:
          height += 53

      # Select multiple answers
      elif isinstance(question['answer'], list):
        content += '<ul style="padding-left: 20px">'

        options = self._get_format_question(
          question=question['question'],
          profile_format=self._profile_format)['options']

        for answer_index in question['answer']:
          height += 40
          content += f'''
          <li>
            {self._get_option_from_index(options, answer_index)['text']}</li>'''

        content += '</ul>'

      # Question risk label
      if 'risk' in question:
        if question['risk'] == 'High':
          content += '<div class="risk-label risk-label-high">HIGH RISK</div>'
        elif question['risk'] == 'Limited':
          content += '''<div class="risk-label risk-label-limited">
                    LIMITED RISK</div>'''

      content += '''</div></div></tr>'''

      index += 1

    return content

  def _generate_table_head(self):
    return '''
      <div class="risk-table">
        <div class="risk-table-head">
          <div class="risk-table-head-question">Question</div>
          <div class="risk-table-head-answer">Answer</div>
        </div>'''

  def _generate_new_page(self):

    # End the current table
    content = '''
      </div>'''

    # End the page
    content += self._generate_footer()
    content += '</div>'

    # Start a new page
    content += '''
      <div class="page">
      '''

    content += self._generate_header()

    content += self._generate_table_head()

    return content

  def _generate_footer(self):
    footer = f'''
    <div class="footer">
      <div class="footer-label">Testrun v{self.version} - {self.created.strftime('%d.%m.%Y')}</div>
    </div>
    '''
    return footer

  def _generate_css(self):
    return '''
    /* Set some global variables */
    :root {
      --header-height: .75in;
      --header-width: 8.5in;
      --header-pos-x: 0in;
      --header-pos-y: 0in;
      --page-width: 8.5in;
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
      margin-bottom: 10px;
      margin-top: 15px;
    }

    h4 {
      font-size: 12px;
      font-weight: 500;
      color: #5F6368;
      margin-bottom: 0;
      margin-top: 0;
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

    @media print {
      @page {
        size: Letter;
        width: 8.5in;
        height: 11in;
      }
    }

    .risk-banner {
      min-height: 120px;
      padding: 5px 40px 0 40px;
      margin-top: 30px;
    }

    .risk-banner-limited {
      background-color: #E4F7FB;
      color: #007B83;
    }

    .risk-banner-high {
      background-color: #FCE8E6;
      color: #C5221F;
    }

    .risk-banner-title {
      text-transform: uppercase;
      font-weight: bold;
    }

    .risk-table {
      width: 100%;
      margin-top: 40px;
      text-align: left;
      color: #3C4043;
      font-size: 14px;
    }

    .risk-table-head {
      margin-bottom: 15px;
    }

    .risk-table-head-question {
      display: inline-block;
      margin-left: 70px;
      font-weight: bold;
    }

    .risk-table-head-answer {
      display: inline-block;
      margin-left: 325px;
      font-weight: bold;
    }

    .risk-table-row {
      margin-bottom: 8px;
      background-color: #F8F9FA;
      display: flex;
      align-items: stretch;
      overflow: hidden;
    }

    .risk-question-no {
      padding: 15px 20px;
      width: 10px;
      display: inline-block;
      vertical-align: top;
      position: relative;
    }

    .risk-question {
      padding: 15px 20px;
      display: inline-block;
      width: 350px;
      vertical-align: top;
      position: relative;
      height: 100%;
    }

    .risk-answer {
      background-color: #E8F0FE;
      padding: 15px 20px;
      display: inline-block;
      width: 340px;
      position: relative;
      height: 100%;
    }

    ul {
      margin-top: 0;
    }

    .risk-label{
      position: absolute;
      top: 0px; 
      right: 0px;
      width: 52px;
      height: 16px;
      font-family: 'Google Sans', sans-serif;
      font-size: 8px;
      font-weight: 500;
      line-height: 16px;
      letter-spacing: 0.64px;
      text-align: center;
      font-weight: bold;
      border-radius: 3px;
    }

    .risk-label-high{
      background-color: #FCE8E6;
      color: #C5221F;
    }

    .risk-label-limited{
      width: 65px;
      background-color:#E4F7FB;
      color: #007B83;
    }
    '''

  def to_pdf(self, device):

    # Resolve the data as html first
    html = self.to_html(device)

    # Convert HTML to PDF in memory using weasyprint
    pdf_bytes = BytesIO()
    HTML(string=html).write_pdf(pdf_bytes)
    return pdf_bytes
