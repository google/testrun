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
from common import logger
import json

LOGGER = logger.get_logger('risk_profile')

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

    self._validate(profile_json, profile_format)
    self._update_risk(profile_format)

  # Load a profile without modifying the created date
  # but still validate the profile
  def load(self, profile_json, profile_format):
    self.name = profile_json['name']
    self.created = datetime.strptime(
      profile_json['created'], '%Y-%m-%d')
    self.version = profile_json['version']
    self.questions = profile_json['questions']
    self.status = None

    self._validate(profile_json, profile_format)
    self._update_risk(profile_format)

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

  def _validate(self, profile_json, profile_format):
    if self._valid(profile_json, profile_format):
      self.status = 'Expired' if self._expired() else 'Valid'
    else:
      self.status = 'Draft'

  def _update_risk(self, profile_format):

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

      self.risk = risk

    else:
      # Remove risk
      risk = None
    self.risk = risk

  def _get_format_question(self, question, profile_format):
    for q in profile_format:
      if q['question'] == question:
        return q
    return None

  def _get_option_from_index(self, options, index):
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
