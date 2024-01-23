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
from dataclasses import dataclass


@dataclass
class TestCase:  # pylint: disable=too-few-public-methods,too-many-instance-attributes
  """Represents a test case."""

  name: str = "test.undefined"
  description: str = ""
  expected_behavior: str = ""
  required_result: str = "Recommended"
  result: str = "Non-Compliant"

  def to_dict(self):
    return {
      "name": self.name,
      "description": self.description,
      "expected_behavior": self.expected_behavior,
      "required_result": self.required_result,
      "result": self.result
    }