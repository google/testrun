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
# Temporarily disabled because using Pytest fixtures
# TODO refactor fixtures to not trigger error
# pylint: disable=redefined-outer-name

import json
import pytest
import os
import glob
import itertools

from pathlib import Path
from dataclasses import dataclass

TEST_MATRIX = 'test_tests.json'
RESULTS_PATH = '/tmp/results/*.json'


#TODO add reason
@dataclass(frozen=True)
class TestResult:
  name: str
  result: str
  __test__ = False


def collect_expected_results(expected_results):
  """ Yields results from expected_results property of the test matrix"""
  for name, result in expected_results.items():
    yield TestResult(name, result)


def collect_actual_results(results_dict):
  """ Yields results from an already loaded testrun results file """
  # "module"."results".[list]."result"
  for test in results_dict.get('tests', {}).get('results', []):
    yield TestResult(test['name'], test['result'])


@pytest.fixture
def test_matrix():
  basedir = os.path.dirname(os.path.abspath(__file__))
  with open(os.path.join(basedir, TEST_MATRIX), encoding='utf-8') as f:
    return json.load(f)


@pytest.fixture
def results():
  results = {}
  for file in [Path(x) for x in glob.glob(RESULTS_PATH)]:
    with open(file, encoding='utf-8') as f:
      results[file.stem] = json.load(f)
  return results


def test_tests(results, test_matrix):
  """ Check if each testers expect results were obtained """
  for tester, props in test_matrix.items():
    expected = set(collect_expected_results(props['expected_results']))
    actual = set(collect_actual_results(results[tester]))
    assert expected & actual == expected


def test_list_tests(capsys, results, test_matrix):
  all_tests = set(
      itertools.chain.from_iterable(
          [collect_actual_results(results[x]) for x in results.keys()]))

  ci_pass = set(
      test for testers in test_matrix.values()
      for test, result in testers['expected_results'].items()
      if result == 'Compliant'
  )

  ci_fail = set(
      test for testers in test_matrix.values()
      for test, result in testers['expected_results'].items()
      if result == 'Non-Compliant'
  )

  with capsys.disabled():
    # TODO: print matching the JSON schema for easy copy/paste
    print('============')
    print('============')
    print('tests seen:')
    print('\n'.join(set(x.name for x in all_tests)))
    print('\ntesting for pass:')
    print('\n'.join(ci_pass))
    print('\ntesting for fail:')
    print('\n'.join(ci_fail))
    print('\ntester results')
    for tester in test_matrix.keys():
      print(f'\n{tester}:')
      print('  expected results:')
      for test in collect_expected_results(
        test_matrix[tester]['expected_results']):
        print(f'    {test.name}: {test.result}')
      print('  actual results:')
      for test in collect_actual_results(results[tester]):
        if test.name in test_matrix[tester]['expected_results']:
          print(
              f'''    {test.name}: {test.result} (exp: {test_matrix[
                tester]["expected_results"][test.name]})'''
          )
        else:
          print(f'    {test.name}: {test.result}')

  assert True
