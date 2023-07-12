#!/bin/bash

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

import json
import pytest
import os
import glob

from pathlib import Path
from dataclasses import dataclass

TEST_MATRIX = 'test_tests.json'
RESULTS_PATH = '/tmp/results/*.json'

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
	for maybe_module, child in results_dict.items():
		if "results" in child and maybe_module != "baseline":
			for test in child["results"]:
				yield TestResult(test['name'], test['result'])


@pytest.fixture
def test_matrix():
  dir = os.path.dirname(os.path.abspath(__file__))
  with open(os.path.join(dir, TEST_MATRIX), encoding='utf-8') as f:
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
	print(results)
	print(test_matrix)
	
	for tester, props in test_matrix.items():
		expected = set(collect_expected_results(props['expected_results']))
		actual = set(collect_actual_results(results[tester]))

		assert expected.issubset(actual), f'{tester} expected results not obtained'
