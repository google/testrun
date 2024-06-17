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
"""Module run all the Risk Profile related unit tests"""
import unittest
import os
import json
from risk_profile import RiskProfile
SECONDS_IN_YEAR = 31536000

MODULE = 'risk_profile'

# Define the file paths
UNIT_TEST_DIR = 'testing/unit/'
TEST_FILES_DIR = os.path.join('testing/unit', MODULE)
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')


class RiskProfileTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open('resources/risk_assessment.json', 'r', encoding='utf-8') as file:
    	cls.profile_format = json.loads(file.read())


  def risk_profile_high_test(self):
  	# Read the risk profile json file
    risk_profile_path = os.path.join(TEST_FILES_DIR, 'risk_profile_valid_high.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file  
    risk_profile = RiskProfile(risk_profile_json,self.profile_format)

    # Write the profile to file
    output_file = os.path.join(OUTPUT_DIR,'risk_profile_high.json')
    with open(output_file, 'w', encoding='utf-8') as file:
   	  file.write(risk_profile.to_json(pretty=True))

  def risk_profile_limited_test(self):
  	# Read the risk profile json file
    risk_profile_path = os.path.join(TEST_FILES_DIR, 'risk_profile_valid_limited.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file  
    risk_profile = RiskProfile(risk_profile_json,self.profile_format)

    # Write the profile to file
    output_file = os.path.join(OUTPUT_DIR,'risk_profile_limited.json')
    with open(output_file, 'w', encoding='utf-8') as file:
   	  file.write(risk_profile.to_json(pretty=True))

  def risk_profile_rename_test(self):
  	# Read the risk profile json file
    risk_profile_path = os.path.join(TEST_FILES_DIR, 'risk_profile_valid_high.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

	# Create the RiskProfile object from the json file  
    risk_profile = RiskProfile(risk_profile_json,self.profile_format)

    # Rename the profile
    risk_profile_json['rename'] = 'Primary profile renamed'
    risk_profile.update(risk_profile_json,self.profile_format)

    # Write the renamed profile to file
    output_file = os.path.join(OUTPUT_DIR,'risk_profile_renamed.json')
    with open(output_file, 'w', encoding='utf-8') as file:
   	  file.write(risk_profile.to_json(pretty=True))

  def risk_profile_draft_test(self):
  	# Read the risk profile json file
    risk_profile_path = os.path.join(TEST_FILES_DIR, 'risk_profile_draft.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file  
    risk_profile = RiskProfile(risk_profile_json,self.profile_format)

    # Write the profile to file
    output_file = os.path.join(OUTPUT_DIR,'risk_profile_draft.json')
    with open(output_file, 'w', encoding='utf-8') as file:
   	  file.write(risk_profile.to_json(pretty=True))

  def risk_profile_expired_test(self):
  	# Read the risk profile json file
    risk_profile_path = os.path.join(TEST_FILES_DIR, 'risk_profile_draft.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file  
    risk_profile = RiskProfile(risk_profile_json,self.profile_format)

    # Write the profile to file
    output_file = os.path.join(OUTPUT_DIR,'risk_profile_draft.json')
    with open(output_file, 'w', encoding='utf-8') as file:
   	  file.write(risk_profile.to_json(pretty=True))

if __name__ == '__main__':
  suite = unittest.TestSuite()

  # suite.addTest(RiskProfileTest('risk_profile_high_test'))
  # suite.addTest(RiskProfileTest('risk_profile_limited_test'))
  # suite.addTest(RiskProfileTest('risk_profile_rename_test'))
  suite.addTest(RiskProfileTest('risk_profile_draft_test'))
  suite.addTest(RiskProfileTest('risk_profile_expired_test'))

  runner = unittest.TextTestRunner()
  runner.run(suite)