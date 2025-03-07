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
""" Test assertions for CI testing of tests """

# pylint: disable=redefined-outer-name

import json
import pytest
import os
import glob
import itertools

from dataclasses import dataclass

TEST_MATRIX = 'test_tests.json'
RESULTS_PATH = '/tmp/results/*.json'


# Define an immutable data class to store test results
@dataclass(frozen=True)
class TestResult:
  # Test name
  name: str
  # Test result
  result: str
  # Disable pytest to avoid recognising the class as a test
  __test__ = False

@pytest.fixture
def test_matrix():
  """ Load the test_tests.json file """

  # Get the directory of the current file
  basedir = os.path.dirname(os.path.abspath(__file__))

  # Construct the full file path
  filepath = os.path.join(basedir, TEST_MATRIX)

  # Open the JSON file
  with open(filepath, 'r', encoding='utf-8') as f:

    # Return the loaded JSON content
    return json.load(f)

def collect_expected_results(expected_results):
  """ Collect the expected results from test_matrix fixture """

  # Iterate over the expected test results
  for name, result in expected_results.items():

    # Create a TestResult object for each test
    yield TestResult(name, result)

@pytest.fixture
def results():
  """ Load the test results from /tmp/results/ """

  # Dict to store results
  results = {}

  # Iterate through result files using module glob
  for file in glob.glob(RESULTS_PATH):

    # Get the file name without the extension
    file_name = os.path.splitext(os.path.basename(file))[0]

    # Open each result file
    with open(file, encoding='utf-8') as f:

      # Load the JSON content and store it with file name as key
      results[file_name] = json.load(f)

  # Return the loaded results
  return results

def collect_actual_results(results_dict):
  """ Collect actual results from loaded testrun results file """

  # Iterate over the 'results'
  for test in results_dict.get('tests', {}).get('results', []):

    # Create a TestResult object for each test
    yield TestResult(test['name'], test['result'])

def test_tests(results, test_matrix):
  """ Test to check if expected results were obtained """

  # Iterate through each tester from test_tests.json
  for tester, props in test_matrix.items():

    # Collect expected results
    expected = set(collect_expected_results(props['expected_results']))

    # Collect actual results
    actual = set(collect_actual_results(results[tester]))

    # Tests missing in actual results for debugging
    missing_in_actual = expected - actual

    # Extra tests present in actual results for debugging
    extra_in_actual = actual - expected

    # Print tester name
    print(f'\nTest: {tester}')

    # Print missing tests if any for debugging
    if missing_in_actual:
      print(f'Missing in actual results: {missing_in_actual}')

     # Print extra tests if any for debugging
    if extra_in_actual:
      print(f'Extra in actual results: {extra_in_actual}')

    # Check if all expected results are present in actual results
    assert expected & actual == expected

def test_list_tests(capsys, results, test_matrix):
  """ List all tests done and categorise based on compliance """

  # Collect all actual test results 10
  all_tests = set(
      itertools.chain.from_iterable(
          [collect_actual_results(results[x]) for x in results.keys()]))

  # Collect all 'Compliant' tests
  ci_pass = set(
      test for testers in test_matrix.values()
      for test, result in testers['expected_results'].items()
      if result == 'Compliant'
  )

  # Collect all 'Non-Compliant' tests
  ci_fail = set(
      test for testers in test_matrix.values()
      for test, result in testers['expected_results'].items()
      if result == 'Non-Compliant'
  )

  # Disable pytest's capture system to allow direct printing of test information
  with capsys.disabled():

    # Print all tests collected in 'all_tests')
    print('tests seen:')
    print('\n'.join(set(x.name for x in all_tests)))

    # Print compliant tests
    print('\ntesting for compliant:')
    print('\n'.join(ci_pass))

    # Print non-compliant tests
    print('\ntesting for non-compliant:')
    print('\n'.join(ci_fail))

    # Print each tester results
    print('\nTester results')

    # Iterate over all testers in the test_tests.json
    for tester in test_matrix.keys():

      print(f'\n{tester}:')

      # Iterate through expected results
      print('  expected results:')
      for test in collect_expected_results(
        test_matrix[tester]['expected_results']):
        print(f'    {test.name}: {test.result}')

      # Iterate through actual results
      print('  actual results:')
      for test in collect_actual_results(results[tester]):
        if test.name in test_matrix[tester]['expected_results']:
          print(
              f'''    {test.name}: {test.result} (exp: {test_matrix[
                tester]['expected_results'][test.name]})'''
          )
        else:
          print(f'    {test.name}: {test.result}')

  assert True
