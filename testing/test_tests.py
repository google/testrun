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

TEST_MATRIX = 'testing/test_tests.json'
with open(TEST_MATRIX) as f:
    test_matrix = json.load(f)

print(test_matrix)
print(test_matrix.keys())

def collect_result_from_file(results_file):
    # "module"."results".[list]."result"
    with open(results_file) as f:
        results = json.load(f)

    for maybe_module, child in results.items():
        if "results" in child and maybe_module != "baseline":
            for test in child["results"]:
                yield test['name'], test['result']

for tester in test_matrix.keys():
    for test_name, test_result in collect_result_from_file(f'/tmp/results/{tester}.json'):
        print(test_name, test_result)