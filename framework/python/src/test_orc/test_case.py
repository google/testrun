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

"""Represents an individual test case."""
from dataclasses import dataclass, field
from  common.statuses import TestResult


@dataclass
class TestCase:  # pylint: disable=too-few-public-methods,too-many-instance-attributes
  """Represents a test case."""

  name: str = "test.undefined"
  description: str = ""
  expected_behavior: str = ""
  required_result: str = "Recommended"
  result: str = TestResult.NON_COMPLIANT
  recommendations: list = field(default_factory=lambda: [])
  optional_recommendations: list = field(default_factory=lambda: [])
  details: str = ""

  def to_dict(self):

    test_dict = {
      "name": self.name,
      "description": self.description,
      "details": self.details,
      "expected_behavior": self.expected_behavior,
      "required_result": self.required_result,
      "result": self.result
    }

    if self.recommendations is not None and len(self.recommendations) > 0:
      test_dict["recommendations"] = self.recommendations

    if (self.optional_recommendations is not None
      and len(self.optional_recommendations) > 0):
      test_dict["optional_recommendations"] = self.optional_recommendations

    return test_dict

  def __post_init__(self):
    self.details = self.details.replace("\n", "", 1)
