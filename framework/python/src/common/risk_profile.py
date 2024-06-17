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
#import datetime
from datetime import datetime
from common import logger
import json

LOGGER = logger.get_logger('risk_profile')
SECONDS_IN_YEAR = 31536000

DATA_COLLECTION_CATEGORY = 'Data Collection'
DATA_TRANSMISSION_CATEGORY = 'Data Transmission'
REMOTE_OPERATION_CATEGORY = 'Remote Operation'
OPERATING_ENVIRONMENT_CATEGORY = 'Operating Environment'

class RiskProfile():
  """Python representation of a risk profile"""

  def __init__(self, profile_json= None, profile_format=None):
    if profile_json is None or profile_format is None:
      return
    self.name = profile_json['name']
    self.created= datetime.now()
    self.version = profile_json['version']
    self.questions = profile_json['questions']
    self.status = None
    self.categories = None
    self._validate(profile_json,profile_format)
    self._update_categories()

  # Load a profile without modifying the created date 
  # but still validate the profile
  def load(self,profile_json, profile_format):
    self.name = profile_json['name']
    self.created = datetime.strptime(profile_json['created'], '%Y-%m-%d %H:%M:%S')
    self.version = profile_json['version']
    self.questions = profile_json['questions']
    self.status = None
    self.categories = None

    self._validate(profile_json,profile_format)
    self._update_categories()
    return self

  def update(self, profile_json, profile_format):
    # Construct a new profile from json data
    new_profile = RiskProfile(profile_json,profile_format)

    # Check if name has changed
    self.name = profile_json['rename'] if 'rename' in profile_json else profile_json['name']

    # Update this profile with newly created profile data
    self.version = new_profile.version
    self.created = new_profile.created
    self.questions = new_profile.questions
    self.status = new_profile.status
    self.categories = new_profile.categories

  def _validate(self,profile_json,profile_format):
    if self._valid(profile_json,profile_format):
      self.status = 'Expired' if self._expired() else 'Valid'
    else:
      self.status='Draft'

  def _update_categories(self):
    if self.status == 'Valid':
      self.categories = []
      self.categories.append(self._get_category_status(DATA_COLLECTION_CATEGORY))
      self.categories.append(self._get_category_status(DATA_TRANSMISSION_CATEGORY))
      self.categories.append(self._get_category_status(REMOTE_OPERATION_CATEGORY))
      self.categories.append(self._get_category_status(OPERATING_ENVIRONMENT_CATEGORY))

  def _check_answer(self,question):
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

  def _get_category_status(self, category):
    status = 'Limited'
    for question in self.questions:
      if 'category' in question and question['category'] == category:
        if question['validation']['required']:
          status = 'High' if self._check_answer(question) == 'High' else status 
    return {'name':category,'status':status} 

  def _get_profile_question(self, profile_json, question):

    for q in profile_json['questions']:
      if question.lower() == q['question'].lower():
        return q

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
      profile_question = self._get_profile_question(
        profile_json, format_question['question']
      )
      try:
        required = format_question['validation']['required']
      except:
        required = False
      if profile_question is not None and required:
        # Check answer is present
        if 'answer' not in profile_question:
          LOGGER.error(
            'Missing answer for question: ' + profile_question.get('question'))
          all_questions_answered = False
      elif required:
          LOGGER.error(
          'Missing question: ' + format_question.get('question'))
          all_questions_present = False

    return all_questions_answered and all_questions_present

  def _expired(self):
    # Check expiry
    created_date = self.created.timestamp()
    today = datetime.now().timestamp()
    return created_date < (today - SECONDS_IN_YEAR)

  def to_json(self,pretty=False):
    json_dict = {
      'name': self.name,
      'version': self.version,
      'created': str(self.created),
      'status': self.status,
      'questions': self.questions
    }
    if self.categories is not None:
      json_dict['categories'] = self.categories
    indent = 2 if pretty else None
    return json.dumps(json_dict,indent=indent)
