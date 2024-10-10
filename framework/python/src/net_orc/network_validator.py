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

"""Holds logic for validation of network services prior to runtime."""
import json
import os
import shutil
import time
import docker
from docker.types import Mount
import getpass
from common import logger
from common import util

LOGGER = logger.get_logger('validator')
OUTPUT_DIR = 'runtime/validation'
DEVICES_DIR = 'modules/devices'
DEVICE_METADATA = 'conf/module_config.json'
DEVICE_BRIDGE = 'tr-d'
CONF_DIR = 'local'
CONF_FILE = 'system.json'
TR_CONTAINER_MAC_PREFIX = '9a:02:57:1e:8f:'

class NetworkValidator:
  """Perform validation of network services."""

  def __init__(self):
    self._net_devices = []

    self._path = os.path.dirname(os.path.dirname(
          os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.realpath(__file__))))))

    self._device_dir = os.path.join(self._path, DEVICES_DIR)

    shutil.rmtree(os.path.join(self._path, OUTPUT_DIR), ignore_errors=True)

  def start(self):
    """Start the network validator."""
    LOGGER.debug('Starting validator')

    # Setup the output directory
    host_user = self._get_host_user()
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    util.run_command(f'chown -R {host_user} {OUTPUT_DIR}')

    self._load_devices()
    #self._build_network_devices()
    self._start_network_devices()

  def stop(self, kill=False):
    """Stop the network validator."""
    LOGGER.debug('Stopping validator')
    self._stop_network_devices(kill)
    LOGGER.debug('Validator stopped')

  def _build_network_devices(self):
    LOGGER.debug('Building network validators...')
    for net_device in self._net_devices:
      self._build_device(net_device)

  def _build_device(self, net_device):
    LOGGER.debug('Building network validator ' + net_device.dir_name)
    try:
      client = docker.from_env()
      client.images.build(dockerfile=os.path.join(net_device.dir,
                                                  net_device.build_file),
                          path=self._path,
                          forcerm=True,
                          tag='test-run/' + net_device.dir_name)
      LOGGER.debug('Validator device built: ' + net_device.dir_name)
    except docker.errors.BuildError as error:
      LOGGER.error('Container build error')
      LOGGER.error(error)

  def _load_devices(self):

    LOGGER.info(f'Loading validators from {self._device_dir}')

    loaded_devices = 'Loaded the following validators: '

    for module_dir in os.listdir(self._device_dir):

      device = FauxDevice()

      # Load basic module information
      with open(os.path.join(self._device_dir, module_dir, DEVICE_METADATA),
                encoding='utf-8') as device_config_file:
        device_json = json.load(device_config_file)

      device.name = device_json['config']['meta']['name']
      device.description = device_json['config']['meta']['description']

      device.dir = os.path.join(self._path, self._device_dir, module_dir)
      device.dir_name = module_dir
      device.build_file = module_dir + '.Dockerfile'
      device.container_name = 'tr-ct-' + device.dir_name
      device.image_name = 'testrun/' + device.dir_name

      runtime_source = os.path.join(os.getcwd(), OUTPUT_DIR, device.name)
      conf_source = os.path.join(os.getcwd(), CONF_DIR)
      os.makedirs(runtime_source, exist_ok=True)

      device.mounts = [
          Mount(target='/runtime/validation',
                source=runtime_source,
                type='bind'),
          Mount(target='/conf', source=conf_source, type='bind',
                read_only=True),
          Mount(target='/runtime/network', source=runtime_source, type='bind')
      ]

      if 'timeout' in device_json['config']['docker']:
        device.timeout = device_json['config']['docker']['timeout']

      # Determine if this is a container or just an image/template
      if 'enable_container' in device_json['config']['docker']:
        device.enable_container = device_json['config']['docker'][
            'enable_container']

      self._net_devices.append(device)

      loaded_devices += device.dir_name + ' '

    LOGGER.info(loaded_devices)

  def _start_network_devices(self):
    LOGGER.debug('Starting network devices')
    for net_device in self._net_devices:
      self._start_network_device(net_device)

  def _start_network_device(self, device):
    LOGGER.info('Starting device ' + device.name)
    LOGGER.debug('Image name: ' + device.image_name)
    LOGGER.debug('Container name: ' + device.container_name)

    try:
      client = docker.from_env()
      device.container = client.containers.run(
          device.image_name,
          auto_remove=True,
          cap_add=['NET_ADMIN'],
          name=device.container_name,
          hostname=device.container_name,
          network='none',
          privileged=True,
          detach=True,
          mounts=device.mounts,
          environment={'HOST_USER': self._get_host_user()})
    except docker.errors.ContainerError as error:
      LOGGER.error('Container run error')
      LOGGER.error(error)

    self._attach_device_to_network(device)

    # Determine the module timeout time
    test_module_timeout = time.time() + device.timeout
    status = self._get_device_status(device)

    while time.time() < test_module_timeout and status == 'running':
      time.sleep(1)
      status = self._get_device_status(device)

    LOGGER.info('Validation device ' + device.name + ' has finished')

  def _get_host_user(self):
    user = self._get_os_user()

    # If primary method failed, try secondary
    if user is None:
      user = self._get_user()

    LOGGER.debug(f'Network validator host user: {user}')
    return user

  def _get_os_user(self):
    user = None
    try:
      user = os.getlogin()
    except OSError:
      # Handle the OSError exception
      LOGGER.error('An OS error occurred while retrieving the login name.')
    except Exception as error: # pylint: disable=W0703
      # Catch any other unexpected exceptions
      LOGGER.error('An exception occurred:', error)
    return user

  def _get_user(self):
    user = None
    try:
      user = getpass.getuser()
    except (KeyError, ImportError, ModuleNotFoundError, OSError) as e:
      # Handle specific exceptions individually
      if isinstance(e, KeyError):
        LOGGER.error('USER environment variable not set or unavailable.')
      elif isinstance(e, ImportError):
        LOGGER.error('Unable to import the getpass module.')
      elif isinstance(e, ModuleNotFoundError):
        LOGGER.error('The getpass module was not found.')
      elif isinstance(e, OSError):
        LOGGER.error('An OS error occurred while retrieving the username.')
      else:
        LOGGER.error('An exception occurred:', e)
    return user

  def _get_device_status(self, module):
    container = self._get_device_container(module)
    if container is not None:
      return container.status
    return None

  def _attach_device_to_network(self, device):
    LOGGER.debug('Attaching device ' + device.name + ' to device bridge')

    # Device bridge interface example: tr-di-dhcp
    # (Test Run Device Interface for DHCP container)
    bridge_intf = DEVICE_BRIDGE + 'i-' + device.dir_name

    # Container interface example:
    # tr-cti-dhcp (Test Run Container Interface for DHCP container)
    container_intf = 'tr-cti-' + device.dir_name

    # Container network namespace name
    container_net_ns = 'tr-ctns-' + device.dir_name

    # Create interface pair
    util.run_command('ip link add ' + bridge_intf + ' type veth peer name ' +
                     container_intf)

    mac_addr = TR_CONTAINER_MAC_PREFIX + '10'

    util.run_command('ip link set dev ' + container_intf +
                     ' address ' + mac_addr)

    # Add bridge interface to device bridge
    util.run_command('ovs-vsctl add-port ' + DEVICE_BRIDGE + ' ' + bridge_intf)

    # Get PID for running container
    # TODO: Some error checking around missing PIDs might be required
    container_pid = util.run_command('docker inspect -f {{.State.Pid}} ' +
                                     device.container_name)[0]

    # Create symlink for container network namespace
    util.run_command('ln -sf /proc/' + container_pid +
                     '/ns/net /var/run/netns/' + container_net_ns)

    # Attach container interface to container network namespace
    util.run_command('ip link set ' + container_intf + ' netns ' +
                     container_net_ns)

    # Rename container interface name to veth0
    util.run_command('ip netns exec ' + container_net_ns + ' ip link set dev ' +
                     container_intf + ' name veth0')


    # Set interfaces up
    util.run_command('ip link set dev ' + bridge_intf + ' up')
    util.run_command('ip netns exec ' + container_net_ns +
                     ' ip link set dev veth0 up')

  def _stop_network_device(self, net_device, kill=False):
    LOGGER.debug('Stopping device container ' + net_device.container_name)
    try:
      container = self._get_device_container(net_device)
      if container is not None:
        if kill:
          LOGGER.debug('Killing container:' + net_device.container_name)
          container.kill()
        else:
          LOGGER.debug('Stopping container:' + net_device.container_name)
          container.stop()
        LOGGER.debug('Container stopped:' + net_device.container_name)
    except Exception as e:  # pylint: disable=W0703
      LOGGER.error('Container stop error')
      LOGGER.error(e)

  def _get_device_container(self, net_device):
    LOGGER.debug('Resolving device container: ' + net_device.container_name)
    container = None
    try:
      client = docker.from_env()
      container = client.containers.get(net_device.container_name)
    except docker.errors.NotFound:
      LOGGER.debug('Container ' + net_device.container_name + ' not found')
    except Exception as e:  # pylint: disable=W0703
      LOGGER.error('Failed to resolve container')
      LOGGER.error(e)
    return container

  def _stop_network_devices(self, kill=False):
    LOGGER.debug('Stopping devices')
    for net_device in self._net_devices:
      # Devices may just be Docker images, so we do not want to stop them
      if not net_device.enable_container:
        continue
      self._stop_network_device(net_device, kill)


class FauxDevice:  # pylint: disable=too-few-public-methods,too-many-instance-attributes
  """Represent a faux device."""

  def __init__(self):
    self.name = 'Unknown device'
    self.description = 'Unknown description'

    self.container = None
    self.container_name = None
    self.image_name = None

    # Absolute path
    self.dir = None

    self.dir_name = None
    self.build_file = None
    self.mounts = []

    self.enable_container = True
    self.timeout = 60
