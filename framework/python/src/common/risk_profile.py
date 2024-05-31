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

SECONDS_IN_YEAR = 31536000

class RiskProfile():

  def __init__(self, json_data):
    self.name = json_data['name']
    self.status = json_data['status']
    self.created = json_data['created']
    self.version = json_data['version']
    self.questions = json_data['questions']

    # Check the profile has not expired
    self.check_status()

  def check_status(self):
    if self.status == 'Valid':

      # Check expiry
      created_date = datetime.strptime(
        self.created, "%Y-%m-%d %H:%M:%S").timestamp()

      today = datetime.now().timestamp()

      if created_date < (today - SECONDS_IN_YEAR):
        self.status = 'Expired'

    return self.status
