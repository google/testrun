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
import sys
from risk_profile import RiskProfile

SECONDS_IN_YEAR = 31536000

MODULE = 'risk_profile'

# Define the file paths
UNIT_TEST_DIR = 'testing/unit/'
TEST_FILES_DIR = os.path.join('testing/unit', MODULE)
PROFILE_DIR = os.path.join(TEST_FILES_DIR, 'profiles')
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')


class RiskProfileTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning DNS behaviors"""

  @classmethod
  def setUpClass(cls):
    # Create the output directories and ignore errors if it already exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(os.path.join('resources', 'risk_assessment.json'),
              'r',
              encoding='utf-8') as file:
      cls.profile_format = json.loads(file.read())

  def risk_profile_high_test(self):
    # Read the risk profile json file
    risk_profile_path = os.path.join(PROFILE_DIR,
                                     'risk_profile_valid_high.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file
    risk_profile = RiskProfile(risk_profile_json, self.profile_format)

    # Write the profile to file
    output_file = os.path.join(OUTPUT_DIR, 'risk_profile_high.json')
    with open(output_file, 'w', encoding='utf-8') as file:
      file.write(risk_profile.to_json(pretty=True))

    self.assertEqual(risk_profile.risk, 'High')

  def risk_profile_limited_test(self):
    # Read the risk profile json file
    risk_profile_path = os.path.join(PROFILE_DIR,
                                     'risk_profile_valid_limited.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file
    risk_profile = RiskProfile(risk_profile_json, self.profile_format)

    # Write the profile to file
    output_file = os.path.join(OUTPUT_DIR, 'risk_profile_limited.json')
    with open(output_file, 'w', encoding='utf-8') as file:
      file.write(risk_profile.to_json(pretty=True))

    self.assertEqual(risk_profile.risk, 'Limited')

  def risk_profile_rename_test(self):
    # Read the risk profile json file
    risk_profile_path = os.path.join(PROFILE_DIR,
                                     'risk_profile_valid_high.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file
    risk_profile = RiskProfile(risk_profile_json, self.profile_format)

    # Rename the profile
    risk_profile_json['rename'] = 'Primary profile renamed'
    risk_profile.update(risk_profile_json, self.profile_format)

    # Write the renamed profile to file
    output_file = os.path.join(OUTPUT_DIR, 'risk_profile_renamed.json')
    with open(output_file, 'w', encoding='utf-8') as file:
      file.write(risk_profile.to_json(pretty=True))

    self.assertEqual(risk_profile.name, 'Primary profile renamed')

  def risk_profile_draft_test(self):
    # Read the risk profile json file
    risk_profile_path = os.path.join(PROFILE_DIR, 'risk_profile_draft.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file
    risk_profile = RiskProfile(risk_profile_json, self.profile_format)

    # Write the profile to file
    output_file = os.path.join(OUTPUT_DIR, 'risk_profile_draft.json')
    with open(output_file, 'w', encoding='utf-8') as file:
      file.write(risk_profile.to_json(pretty=True))

    self.assertEqual(risk_profile.status, 'Draft')

  def risk_profile_expired_test(self):
    # Read the risk profile json file
    risk_profile_path = os.path.join(PROFILE_DIR, 'risk_profile_expired.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Create the RiskProfile object from the json file
    risk_profile = RiskProfile().load(risk_profile_json, self.profile_format)

    # Write the profile to file
    output_file = os.path.join(OUTPUT_DIR, 'risk_profile_expired.json')
    with open(output_file, 'w', encoding='utf-8') as file:
      file.write(risk_profile.to_json(pretty=True))

    self.assertEqual(risk_profile.status, 'Expired')

  def risk_profile_update_risk_test(self):
    # Read the risk profile json file
    risk_profile_path = os.path.join(PROFILE_DIR,
                                     'risk_profile_valid_high.json')
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Load the initial risk profile
    risk_profile = RiskProfile().load(risk_profile_json, self.profile_format)

    # Check risk profile risk is high
    self.assertEqual(risk_profile.risk, 'High')

    # Load updated risk profile path
    risk_profile_path = os.path.join(PROFILE_DIR,
                                     'risk_profile_valid_limited.json')

    # Read the JSON for the updated profile
    with open(risk_profile_path, 'r', encoding='utf-8') as file:
      risk_profile_json = json.loads(file.read())

    # Update the risk profile
    risk_profile.update(risk_profile_json, self.profile_format)

    # Refresh the risk
    risk_profile.update_risk(self.profile_format)

    # Risk should now be limited after update
    self.assertEqual(risk_profile.risk, 'Limited')


if __name__ == '__main__':
  suite = unittest.TestSuite()

  suite.addTest(RiskProfileTest('risk_profile_high_test'))
  suite.addTest(RiskProfileTest('risk_profile_limited_test'))
  suite.addTest(RiskProfileTest('risk_profile_rename_test'))
  suite.addTest(RiskProfileTest('risk_profile_draft_test'))
  suite.addTest(RiskProfileTest('risk_profile_expired_test'))
  suite.addTest(RiskProfileTest('risk_profile_update_risk_test'))

  runner = unittest.TextTestRunner()
  test_result = runner.run(suite)

  # Check if the tests failed and exit with the appropriate code
  if not test_result.wasSuccessful():
    sys.exit(1)  # Return a non-zero exit code for failures
  sys.exit(0)  # Return zero for success
