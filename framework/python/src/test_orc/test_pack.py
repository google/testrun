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

"""Represents a testing pack."""
from types import ModuleType
from typing import List, Dict
from dataclasses import dataclass, field
from collections import defaultdict
import os
import sys
import json
import importlib

RESOURCES_DIR = "resources"

TEST_PACKS_DIR = os.path.join(RESOURCES_DIR, "test_packs")
TEST_PACK_CONFIG_FILE = "config.json"
TEST_PACK_LOGIC_FILE = "test_pack.py"


@dataclass
class TestPack:  # pylint: disable=too-few-public-methods,too-many-instance-attributes
  """Represents a test pack."""

  name: str = "undefined"
  description: str = ""
  tests: List[dict] = field(default_factory=lambda: [])
  language: Dict = field(default_factory=lambda: defaultdict(dict))
  pack_logic: ModuleType = None
  path: str = ""

  def get_test(self, test_name: str) -> str:
    """Get details of a test from the test pack"""

    for test in self.tests:
      if "name" in test and test["name"].lower() == test_name.lower():
        return test

  def get_required_result(self, test_name: str) -> str:
    """Fetch the required result of the test"""

    test = self.get_test(test_name)

    if test is not None and "required_result" in test:
      return test["required_result"]

    return "Informational"

  def get_logic(self):
    return self.pack_logic

  def get_message(self, name: str) -> str:
    if name in self.language:
      return self.language[name]
    return "Message not found"

  def to_dict(self):
    return {
      "name": self.name,
      "description": self.description,
      "tests": self.tests,
      "language": self.language
    }

  @staticmethod
  def load_logic(source, module_name=None):
    """Reads file source and loads it as a module"""

    spec = importlib.util.spec_from_file_location(module_name, source)
    module = importlib.util.module_from_spec(spec)

    # Add the module to sys.modules
    sys.modules[module_name] = module

    # Execute the module
    spec.loader.exec_module(module)

    return module

  @staticmethod
  def get_test_packs() -> List["TestPack"]:

    root_path = os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.realpath(__file__))))))
    test_packs = []

    for test_pack_folder in os.listdir(TEST_PACKS_DIR):
      test_pack_path = os.path.join(
        root_path,
        TEST_PACKS_DIR,
        test_pack_folder
      )

      with open(os.path.join(
        test_pack_path,
        TEST_PACK_CONFIG_FILE), encoding="utf-8") as f:
        test_pack_json = json.load(f)

      test_pack: TestPack = TestPack(
        name = test_pack_json["name"],
        tests = test_pack_json["tests"],
        language = test_pack_json["language"],
        pack_logic = TestPack.load_logic(
          os.path.join(test_pack_path, TEST_PACK_LOGIC_FILE),
          "test_pack_" + test_pack_folder + "_logic"
          ),
        path = test_pack_path
      )
      test_packs.append(test_pack)

    return test_packs

  @staticmethod
  def get_test_pack(name: str, test_packs: List["TestPack"]=None) -> "TestPack":
    if test_packs is None:
      test_packs = TestPack.get_test_packs()
    for test_pack in test_packs:
      if test_pack.name.lower() == name.lower():
        return test_pack
    return None
