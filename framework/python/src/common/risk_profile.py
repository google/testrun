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
import os

PROFILES_PATH = 'local/risk_profiles'

class RiskProfile():
  """Python representation of a risk profile"""

  def __init__(self, json_data):
    self.name = json_data['name']

    if 'status' in json_data:
      self.status = json_data['status']
    else:
      self.status = 'Draft'

    self.created = datetime.strptime(json_data['created'],
                                     '%Y-%m-%d')
    self.version = json_data['version']
    self.questions = json_data['questions']

  def to_json(self):
    json = {
      'name': self.name,
      'version': self.version,
      'created': self.created.strftime('%Y-%m-%d'),
      'status': self.status,
      'questions': self.questions
    }
    return json

  def get_file_path(self):
    return os.path.join(PROFILES_PATH,
                        self.name + '.json')
