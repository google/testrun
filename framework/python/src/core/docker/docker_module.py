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
"""Represents the base module."""
import docker
from docker.models.containers import Container
import os
from common import logger
import json

IMAGE_PREFIX = 'testrun/'
CONTAINER_PREFIX = 'tr-ct'
DEFAULT_NETWORK = 'bridge'
DEFAULT_LOG_LEVEL = 'INFO'

class Module:
  """Represents the base module."""

  def __init__(self,
               module_config_file,
               session,
               docker_network=DEFAULT_NETWORK,
               extra_hosts=None):
    self._session = session
    self.extra_hosts = extra_hosts
    self.log_level=DEFAULT_LOG_LEVEL

    # Read the config file into a json object
    with open(module_config_file, encoding='UTF-8') as config_file:
      module_json = json.load(config_file)

    self.docker_network = docker_network
    # General module information
    self.name = module_json['config']['meta']['name']
    self.display_name = module_json['config']['meta']['display_name']
    self.description = module_json['config']['meta']['description']
    self.enabled = module_json['config'].get('enabled', True)
    self.depends_on = module_json['config']['docker'].get('depends_on', None)

    # Absolute path
    # Store the root directory of Testrun based on the expected locatoin
    # Testrun/modules/<network or test>/<module>/conf -> 5 levels
    self.root_path = os.path.abspath(
        os.path.join(module_config_file, '../../../../..'))
    self.dir = os.path.dirname(os.path.dirname(module_config_file))
    self.dir_name = os.path.basename(self.dir)

    # Docker settings
    self.build_file = self.dir_name + '.Dockerfile'
    self.image_name = f'{IMAGE_PREFIX}{self.dir_name}'
    self.container_name = f'{CONTAINER_PREFIX}-{self.dir_name}'
    if 'tests' in module_json['config']:
      # Append Test module
      self.image_name += '-test'
      self.container_name += '-test'
    self.enable_container = module_json['config']['docker'].get(
        'enable_container', True)
    self.container: Container = None

    # Configure the module logger
    self._add_logger(log_name=self.name, module_name=self.name)
    try:
      self.log_level = self._get_module_log_level(module_json)
      self.logger.setLevel(self.log_level)
    except Exception as error:
      self.logger.error('Could not set defined log level')
      self.logger.error(error)

    self.setup_module(module_json)

  def _add_logger(self, log_name, module_name, log_dir=None):
    self.logger = logger.get_logger(
        name=f'{log_name}_module',  # pylint: disable=E1123
        log_file=f'{module_name}_module',
        log_dir=log_dir)

  def build(self):
    self.logger.debug('Building module ' + self.dir_name)
    client = docker.from_env()
    client.images.build(
        dockerfile=os.path.join(self.dir, self.build_file),
        path=self._path,
        forcerm=True,  # Cleans up intermediate containers during build
        tag=self.image_name)

  def get_container(self):
    container = None
    try:
      client = docker.from_env()
      container = client.containers.get(self.container_name)
    except docker.errors.NotFound:
      self.logger.debug('Container ' + self.container_name + ' not found')
    except docker.errors.APIError as error:
      self.logger.error('Failed to resolve container')
      self.logger.error(error)
    return container

  def get_session(self):
    return self._session

  def get_status(self):
    self.container = self.get_container()
    if self.container is not None:
      return self.container.status
    return None

  def get_network(self):
    return self.docker_network

  def get_mounts(self):
    return []

  def get_environment(self, device=None):  # pylint: disable=W0613
    return {}

  def _get_module_log_level(self, module_json):
    log_level = DEFAULT_LOG_LEVEL
    try:
      test_modules = self.get_session().get_config().get('test_modules', {})
      test_config = test_modules.get(self.name, {})
      sys_log_level = test_config.get('log_level', None)

      if sys_log_level is not None:
        log_level = sys_log_level
      elif 'log_level' in module_json['config']:
        log_level = module_json['config']['log_level']
    except Exception: # pylint: disable=W0718
      # Ignore errors, just use default
      log_level = DEFAULT_LOG_LEVEL
    return log_level # pylint: disable=W0150

  def setup_module(self, module_json):
    pass

  def _setup_runtime(self, device=None):
    pass

  def start(self, device=None):
    self._setup_runtime(device)

    self.logger.debug('Starting module ' + self.display_name)
    network = self.get_network()
    self.logger.debug(f"""Network: {network}, image name: {self.image_name},
                       container name: {self.container_name}""")

    try:
      client = docker.from_env()
      self.container = client.containers.run(
          self.image_name,
          auto_remove=True,
          cap_add=['NET_ADMIN'],
          name=self.container_name,
          hostname=self.container_name,
          network_mode=network,
          privileged=True,
          detach=True,
          mounts=self.get_mounts(),
          environment=self.get_environment(device),
          extra_hosts=self.extra_hosts if self.extra_hosts is not None else {})
    except docker.errors.ContainerError as error:
      self.logger.error('Container run error')
      self.logger.error(error)

  def stop(self, kill=False):
    self.logger.debug('Stopping module ' + self.container_name)
    try:
      container = self.get_container()
      if container is not None:
        if kill:
          self.logger.debug('Killing container: ' + self.container_name)
          container.kill()
        else:
          self.logger.debug('Stopping container: ' + self.container_name)
          container.stop()
        self.logger.debug('Container stopped: ' + self.container_name)
    except Exception as error:  # pylint: disable=W0703
      self.logger.error('Container stop error')
      self.logger.error(error)
