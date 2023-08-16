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

"""Track device object information."""

from typing import Dict
from dataclasses import dataclass, field

@dataclass
class Device():
  """Represents a physical device and it's configuration."""

  mac_addr: str = None
  manufacturer: str = None
  model: str = None
  test_modules: Dict = field(default_factory=dict)
  ip_addr: str = None
  firmware: str = None
  device_folder: str = None
  reports = []
  max_device_reports: int = None

  def add_report(self, report):
    self.reports.append(report)

  def get_reports(self):
    return self.reports

  # TODO: Add ability to remove reports once test reports have been cleaned up

  def to_json(self):
    """Returns the device as a python dictionary. This is used for the
    # system status API endpoint and in the report."""
    device_json = {}
    device_json['mac_addr'] = self.mac_addr
    device_json['manufacturer'] = self.manufacturer
    device_json['model'] = self.model
    if self.firmware is not None:
      device_json['firmware'] = self.firmware
    return device_json

  def to_config_json(self):
    """Returns the device as a python dictionary. Fields relevant to the device
    config json file are exported."""
    device_json = {}
    device_json['mac_addr'] = self.mac_addr
    device_json['manufacturer'] = self.manufacturer
    device_json['model'] = self.model
    device_json['test_modules'] = self.test_modules
    return device_json
