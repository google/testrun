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

import json
import os
import platform
from typing import List, Dict, Mapping
from dataclasses import dataclass, field
from common.testreport import TestReport
from datetime import datetime
import distro
import requests

_LOCAL_DEVICES_DIR = 'local/devices'
_DEVICE_CONFIG_FILE = 'device_config.json'

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
  kernel: str = None
  device_folder: str = None
  reports: List[TestReport] = field(default_factory=list)
  max_device_reports: int = None
  created_at: datetime = field(default_factory=datetime.now)
  modified_at: datetime = field(default_factory=datetime.now)

  # Store the original values to detect changes
  _initial_values: dict = field(init=False, repr=False, default_factory=dict)

  def add_report(self, report):
    self.reports.append(report)

  def get_report_by_folder_name(self, folder_name: str) -> TestReport | None:
    for report in self.reports:
      report_folder_name = report.get_folder_name()
      if report_folder_name == folder_name:
        return report
      if report_folder_name is None or report_folder_name == '':
        if report.get_report_url().split('/')[-1] == folder_name:
          report.set_report_url(folder_name)
          return report
    return None

  def get_reports(self):
    return self.reports

  def sort_reports(self):
    self.reports.sort(key=lambda r: r.get_started() or datetime.min)

  def clear_reports(self):
    self.reports = []

  def remove_report(self, report: TestReport):
    if report in self.reports:
      self.reports.remove(report)
      report.delete_folder()
      self.export_config_json()

  def remove_reports(self):
    for report in self.reports:
      report.delete_folder()
    self.clear_reports()

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

    if self.kernel is not None:
      device_json['kernel'] = self.kernel

    device_json['test_modules'] = self.test_modules
    device_json['reports'] = [
      report.to_json() for report in self.reports] if self.reports else []
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

    if self.kernel is not None:
      device_json['kernel'] = self.kernel

    device_json['reports'] = [
      report.to_json() for report in self.reports] if self.reports else []

    return device_json

  def export_config_json(self):
    """Exports the device config as a json file to the specified path."""
    # Locate parent directory
    current_dir = os.path.dirname(os.path.realpath(__file__))
    root_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))
    config_file_path = os.path.join(root_dir, _LOCAL_DEVICES_DIR,
                                    self.device_folder, _DEVICE_CONFIG_FILE)

    with open(config_file_path, 'w+', encoding='utf-8') as config_file:
      config_file.writelines(json.dumps(self.to_config_json(), indent=4))

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


@dataclass
class DeviceWithReport():
  device: Device | None = None
  report: TestReport | None = None


@dataclass
class Host():
  """Testrun host metadata"""
  python_version: str
  linux_env: str | None = ''
  location: str | None = ''

  @classmethod
  def get_location(cls) -> str:
    """Fetches the location of the host system using an external API."""
    try:
      response = requests.get('https://ipinfo.io/json', timeout=5)
      if response.status_code == 200:
        data = response.json()
        country = data['country']
        region = data['region']
        city = data['city']
        return f'{country}/{region}/{city}'
      else:
        return ''
    except Exception:
      return ''

  @classmethod
  def get_host_metadata(cls) -> 'Host':
    """Returns the host metadata as a Host object"""
    try:
      python_version = platform.python_version()
    except Exception:
      python_version = ''
    try:
      linux_env=distro.name(pretty=True)
    except Exception:
      linux_env = ''
    location = Host.get_location()
    return cls(
      python_version=python_version,
      linux_env=linux_env,
      location=location
      )

  def to_dict(self) -> Mapping:
    """Returns the host metadata as a python dictionary"""
    host_json = {}
    host_json['python_version'] = self.python_version
    host_json['linux_env'] = self.linux_env
    host_json['location'] = self.location
    return host_json


