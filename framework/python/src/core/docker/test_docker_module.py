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
from core.docker.docker_module import Module
from test_orc.test_case import TestCase
import os
import json
from common import util
from docker.types import Mount

RUNTIME_DIR = 'runtime'
RUNTIME_TEST_DIR = os.path.join(RUNTIME_DIR, 'test')
DEFAULT_TIMEOUT = 60  # time in seconds


class TestModule(Module):
  """Represents a test module."""

  def __init__(self, module_config_file, session, extra_hosts):
    super().__init__(module_config_file=module_config_file,
                     session=session,
                     extra_hosts=extra_hosts)

    # Set IP Index for all test modules
    self.ip_index = 9

  def setup_module(self, module_json):
    # Set the defaults
    self.network = True
    self.total_tests = 0
    self.time = DEFAULT_TIMEOUT
    self.tests: list = []

    if 'timeout' in module_json['config']['docker']:
      self.timeout = module_json['config']['docker']['timeout']

    # Determine if this module needs network access
    if 'network' in module_json['config']:
      self.network = module_json['config']['network']

    # Load test cases
    if 'tests' in module_json['config']:
      self.total_tests = len(module_json['config']['tests'])
      for test_case_json in module_json['config']['tests']:
        try:
          test_case = TestCase(
              name=test_case_json['name'],
              description=test_case_json['test_description'],
              expected_behavior=test_case_json['expected_behavior'])

          # Check if steps to resolve have been specified
          if 'recommendations' in test_case_json:
            test_case.recommendations = test_case_json['recommendations']

          self.tests.append(test_case)
        except Exception as error:  # pylint: disable=W0718
          self.logger.error('Failed to load test case. See error for details')
          self.logger.error(error)

  def _setup_runtime(self, device):
    self.device_test_dir = os.path.join(self.root_path, RUNTIME_TEST_DIR,
                                        device.mac_addr.replace(':', ''))

    self.container_runtime_dir = os.path.join(self.device_test_dir, self.name)
    os.makedirs(self.container_runtime_dir, exist_ok=True)

    self.container_log_file = os.path.join(self.container_runtime_dir,
                                           'module.log')

    self.config_file = os.path.join(self.root_path, 'local/system.json')
    self.root_certs_dir = os.path.join(self.root_path, 'local/root_certs')

    self.network_runtime_dir = os.path.join(self.root_path, 'runtime/network')

    self.device_startup_capture = os.path.join(self.device_test_dir,
                                               'startup.pcap')
    host_user = self.get_session().get_host_user()
    util.run_command(f'chown -R {host_user} {self.device_startup_capture}')

    self.device_monitor_capture = os.path.join(self.device_test_dir,
                                               'monitor.pcap')
    util.run_command(f'chown -R {host_user} {self.device_monitor_capture}')

  def get_environment(self, device):
    environment = {
        'TZ': self.get_session().get_timezone(),
        'HOST_USER': self.get_session().get_host_user(),
        'DEVICE_MAC': device.mac_addr,
        'IPV4_ADDR': device.ip_addr,
        'DEVICE_TEST_MODULES': json.dumps(device.test_modules),
        'IPV4_SUBNET': self.get_session().get_ipv4_subnet(),
        'IPV6_SUBNET': self.get_session().get_ipv6_subnet(),
        'DEV_IFACE': self.get_session().get_device_interface(),
        'DEV_IFACE_MAC': self.get_session().get_device_interface_mac_addr()
    }
    return environment

  def get_mounts(self):
    mounts = [
        Mount(target='/testrun/system.json',
              source=self.config_file,
              type='bind',
              read_only=True),
        Mount(target='/testrun/root_certs',
              source=self.root_certs_dir,
              type='bind',
              read_only=True),
        Mount(target='/runtime/output',
              source=self.container_runtime_dir,
              type='bind'),
        Mount(target='/runtime/network',
              source=self.network_runtime_dir,
              type='bind',
              read_only=True),
        Mount(target='/runtime/device/startup.pcap',
              source=self.device_startup_capture,
              type='bind',
              read_only=True),
        Mount(target='/runtime/device/monitor.pcap',
              source=self.device_monitor_capture,
              type='bind',
              read_only=True)
    ]
    return mounts
