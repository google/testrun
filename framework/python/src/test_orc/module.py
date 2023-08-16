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

"""Represents a test module."""
from dataclasses import dataclass, field
from docker.models.containers import Container

@dataclass
class TestModule:  # pylint: disable=too-few-public-methods,too-many-instance-attributes
  """Represents a test module."""

  # General test module information
  name: str = None
  display_name: str = None
  description: str = None
  tests: list = field(default_factory=lambda: [])

  # Docker settings
  build_file: str = None
  container: Container = None
  container_name: str = None
  image_name: str = None
  enable_container: bool = True
  network: bool = True
  timeout: int = 60

  # Absolute path
  dir: str = None
  dir_name: str = None

  # Set IP Index for all test modules
  ip_index: str = 9
