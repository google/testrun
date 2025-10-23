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

from typing import List, Dict
from dataclasses import dataclass, field
from common.testreport import TestReport
from datetime import datetime

@dataclass
class Device():
  """Represents a physical device and it's configuration."""

  status: str = 'Valid'
  folder_url: str = None
  mac_addr: str = None
  manufacturer: str = None
  model: str = None
  type: str = None
  technology: str = None
  test_pack: str = 'Device Qualification'
  additional_info: List[dict] = field(default_factory=list)
  test_modules: Dict = field(default_factory=dict)
  ip_addr: str = None
  firmware: str = None
  device_folder: str = None
  reports: List[TestReport] = field(default_factory=list)
  max_device_reports: int = None
  created_at: datetime = field(default_factory=datetime.now)
  modified_at: datetime = field(default_factory=datetime.now)

  # Store the original values to detect changes
  _initial_values: dict = field(init=False, repr=False, default_factory=dict)

  def add_report(self, report):
    self.reports.append(report)

  def get_reports(self):
    return self.reports

  def clear_reports(self):
    self.reports = []

  def remove_report(self, timestamp: datetime):
    for report in self.reports:
      if report.get_started().strftime('%Y-%m-%dT%H:%M:%S') == timestamp:
        self.reports.remove(report)
        return

  def to_dict(self):
    """Returns the device as a python dictionary. This is used for the
    system status API endpoint and in the report."""
    device_json = {}
    device_json['status'] = self.status
    device_json['mac_addr'] = self.mac_addr
    device_json['manufacturer'] = self.manufacturer
    device_json['model'] = self.model
    device_json['type'] = self.type
    device_json['technology'] = self.technology
    device_json['test_pack'] = self.test_pack
    device_json['additional_info'] = self.additional_info
    device_json['created_at'] = self.created_at.isoformat()
    device_json['modified_at'] = self.modified_at.isoformat()

    if self.firmware is not None:
      device_json['firmware'] = self.firmware

    device_json['test_modules'] = self.test_modules
    return device_json

  def to_config_json(self):
    """Returns the device as a python dictionary. Fields relevant to the device
    config json file are exported."""
    device_json = {}
    device_json['mac_addr'] = self.mac_addr
    device_json['manufacturer'] = self.manufacturer
    device_json['model'] = self.model
    device_json['type'] = self.type
    device_json['technology'] = self.technology
    device_json['test_pack'] = self.test_pack
    device_json['test_modules'] = self.test_modules
    device_json['additional_info'] = self.additional_info
    device_json['created_at'] = self.created_at.isoformat()
    device_json['modified_at'] = self.modified_at.isoformat()

    return device_json

  def __post_init__(self):
    # Store initial values after creation
    for f in self.__dataclass_fields__:
      if f not in ['created_at', 'modified_at', '_initial_values']:
        self._initial_values[f] = getattr(self, f)

  def __setattr__(self, name: str, value: any) -> None:
    if (name not in ['created_at', 'modified_at', '_initial_values'] and
      hasattr(self, name) and getattr(self, name) != value):
      # Update the last_updated timestamp
      super().__setattr__('modified_at', datetime.now())
    super().__setattr__(name, value)
