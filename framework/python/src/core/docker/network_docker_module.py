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
import os
from docker.types import Mount

RUNTIME_DIR = 'runtime'
RUNTIME_TEST_DIR = os.path.join(RUNTIME_DIR, 'test')
DEFAULT_TIMEOUT = 60  # time in seconds
DEFAULT_DOCKER_NETWORK = 'none'


class NetworkModule(Module):
  """Represents a test module."""

  def __init__(self, module_config_file, session):
    super().__init__(module_config_file=module_config_file,
                     docker_network=DEFAULT_DOCKER_NETWORK,
                     session=session)

  def setup_module(self, module_json):
    self.template = module_json['config']['docker'].get('template', False)
    self.net_config = NetworkModuleNetConfig()
    if self.enable_container:
      self.net_config.enable_wan = module_json['config']['network'].get(
          'enable_wan', False)
      self.net_config.host = module_json['config']['network'].get('host', False)
      # Override default network if host is requested
      if self.net_config.host:
        self.docker_network = 'host'

      if not self.net_config.host:
        self.net_config.ip_index = module_json['config']['network'].get(
            'ip_index')

        self.net_config.ipv4_address = self.get_session().get_ipv4_subnet()[
            self.net_config.ip_index]
        self.net_config.ipv4_network = self.get_session().get_ipv4_subnet()

        self.net_config.ipv6_address = self.get_session().get_ipv6_subnet()[
            self.net_config.ip_index]

        self.net_config.ipv6_network = self.get_session().get_ipv6_subnet()

      self._mounts = []
      if 'mounts' in module_json['config']['docker']:
        for mount_point in module_json['config']['docker']['mounts']:
          self._mounts.append(
              Mount(target=mount_point['target'],
                    source=os.path.join(os.getcwd(), mount_point['source']),
                    type='bind'))

  def _setup_runtime(self, device):
    pass

  def get_environment(self, device=None):  # pylint: disable=W0613
    environment = {
        'TZ': self.get_session().get_timezone(),
        'HOST_USER': self.get_session().get_host_user(),
        'LOG_LEVEL': self.log_level
    }
    return environment

  def get_mounts(self):
    return self._mounts


class NetworkModuleNetConfig:
  """Define all the properties of the network config for a network module"""

  def __init__(self):

    self.enable_wan = False

    self.ip_index = 0
    self.ipv4_address = None
    self.ipv4_network = None
    self.ipv6_address = None
    self.ipv6_network = None

    self.host = False

  def get_ipv4_addr_with_prefix(self):
    return format(self.ipv4_address) + '/' + str(self.ipv4_network.prefixlen)

  def get_ipv6_addr_with_prefix(self):
    return format(self.ipv6_address) + '/' + str(self.ipv6_network.prefixlen)
