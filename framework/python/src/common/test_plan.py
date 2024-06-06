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
"""Stores the test plan requirements"""

class TestPlan():

  def __init__(self, json_data):
    self.version = json_data['config']['meta']['version']
    self.required = []
    self.roadmap = []

  def _load_tests(self, json_data):
  	for module in json_data['config']['modules']:
  		for test in module['tests']:
  			if 'Required' in test['required_result']:
  				self._required.append(test['name'])
  			elif 'Roadmap' in test['required_result']:
  				self._roadmap.append(test['name'])


  def is_required(self, test_name):
  	return test_name in self._required

  def is_roadmap(self, test_name):
  	return test_name in self._roadmap
