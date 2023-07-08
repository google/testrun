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
"""Network orchestrator is responsible for managing
all of the virtual network services"""
import getpass
import ipaddress
import json
import os
from scapy.all import sniff, wrpcap, BOOTP
import shutil
import subprocess
import sys
import docker
from docker.types import Mount
from common import logger
from common import util
from net_orc.listener import Listener
from net_orc.network_device import NetworkDevice
from net_orc.network_event import NetworkEvent
from net_orc.network_validator import NetworkValidator
from net_orc.ovs_control import OVSControl
from net_orc.ip_control import IPControl

LOGGER = logger.get_logger('net_orc')
CONFIG_FILE = 'local/system.json'
EXAMPLE_CONFIG_FILE = 'local/system.json.example'
RUNTIME_DIR = 'runtime'
TEST_DIR = 'test'
MONITOR_PCAP = 'monitor.pcap'
NET_DIR = 'runtime/network'
NETWORK_MODULES_DIR = 'modules/network'
NETWORK_MODULE_METADATA = 'conf/module_config.json'
DEVICE_BRIDGE = 'tr-d'
INTERNET_BRIDGE = 'tr-c'
PRIVATE_DOCKER_NET = 'tr-private-net'
CONTAINER_NAME = 'network_orchestrator'

RUNTIME_KEY = 'runtime'
MONITOR_PERIOD_KEY = 'monitor_period'
STARTUP_TIMEOUT_KEY = 'startup_timeout'
DEFAULT_STARTUP_TIMEOUT = 60
DEFAULT_RUNTIME = 1200
DEFAULT_MONITOR_PERIOD = 300

class NetworkOrchestrator:
  """Manage and controls a virtual testing network."""

  def __init__(self,
               config_file=CONFIG_FILE,
               validate=True,
               single_intf=False):

    self._runtime = DEFAULT_RUNTIME
    self._startup_timeout = DEFAULT_STARTUP_TIMEOUT
    self._monitor_period = DEFAULT_MONITOR_PERIOD
    self._monitor_in_progress = False

    self._int_intf = None
    self._dev_intf = None
    self._single_intf = single_intf

    self.listener = None
    self._net_modules = []
    self._devices = []
    self.validate = validate

    self._path = os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.realpath(__file__))))))

    self.validator = NetworkValidator()
    shutil.rmtree(os.path.join(os.getcwd(), NET_DIR), ignore_errors=True)
    self.network_config = NetworkConfig()
    self.load_config(config_file)
    self._ovs = OVSControl()
    self._ip_ctrl = IPControl()

  def start(self):
    """Start the network orchestrator."""

    LOGGER.debug('Starting network orchestrator')

    self._host_user = util.get_host_user()

    # Get all components ready
    self.load_network_modules()

    # Restore the network first if required
    self.stop(kill=True)

    self.start_network()

  def start_network(self):
    """Start the virtual testing network."""
    LOGGER.info('Starting network')

    self.build_network_modules()
    self.create_net()
    self.start_network_services()

    if self.validate:
      # Start the validator after network is ready
      self.validator.start()

    # Get network ready (via Network orchestrator)
    LOGGER.debug('Network is ready')

  def start_listener(self):
    self.listener.start_listener()

  def stop(self, kill=False):
    """Stop the network orchestrator."""
    self.stop_validator(kill=kill)
    self.stop_network(kill=kill)

  def stop_validator(self, kill=False):
    """Stop the network validator."""
    # Shutdown the validator
    self.validator.stop(kill=kill)

  def stop_network(self, kill=False):
    """Stop the virtual testing network."""
    # Shutdown network
    self.stop_networking_services(kill=kill)
    self.restore_net()

  def load_config(self, config_file=None):
    if config_file is None:
      # If not defined, use relative pathing to local file
      self._config_file = os.path.join(self._path, CONFIG_FILE)
    else:
      # If defined, use as provided
      self._config_file = config_file

    if not os.path.isfile(self._config_file):
      LOGGER.error('Configuration file is not present at ' + config_file)
      LOGGER.info('An example is present in ' + EXAMPLE_CONFIG_FILE)
      sys.exit(1)

    LOGGER.info('Loading config file: ' + os.path.abspath(self._config_file))
    with open(self._config_file, encoding='UTF-8') as config_json_file:
      config_json = json.load(config_json_file)
      self.import_config(config_json)

  def _device_discovered(self, mac_addr):

    self._monitor_in_progress = True

    LOGGER.debug(
        f'Discovered device {mac_addr}. Waiting for device to obtain IP')

    device = self._get_device(mac_addr=mac_addr)

    device_runtime_dir = os.path.join(RUNTIME_DIR, TEST_DIR,
                                      device.mac_addr.replace(':', ''))
    os.makedirs(device_runtime_dir)
    util.run_command(f'chown -R {self._host_user} {device_runtime_dir}')

    packet_capture = sniff(iface=self._dev_intf,
                           timeout=self._startup_timeout,
                           stop_filter=self._device_has_ip)
    wrpcap(
        os.path.join(RUNTIME_DIR, TEST_DIR, device.mac_addr.replace(':', ''),
                     'startup.pcap'), packet_capture)

    if device.ip_addr is None:
      LOGGER.info(
          f'Timed out whilst waiting for {mac_addr} to obtain an IP address')
      return
    LOGGER.info(
        f'Device with mac addr {device.mac_addr} has obtained IP address '
        f'{device.ip_addr}')

    self._start_device_monitor(device)

  def monitor_in_progress(self):
    return self._monitor_in_progress

  def _device_has_ip(self, packet):
    device = self._get_device(mac_addr=packet.src)
    if device is None or device.ip_addr is None:
      return False
    return True

  def _dhcp_lease_ack(self, packet):
    mac_addr = packet[BOOTP].chaddr.hex(':')[0:17]
    device = self._get_device(mac_addr=mac_addr)
    device.ip_addr = packet[BOOTP].yiaddr

  def _start_device_monitor(self, device):
    """Start a timer until the steady state has been reached and
        callback the steady state method for this device."""
    LOGGER.info(f'Monitoring device with mac addr {device.mac_addr} '
                f'for {str(self._monitor_period)} seconds')

    packet_capture = sniff(iface=self._dev_intf, timeout=self._monitor_period)
    wrpcap(
        os.path.join(RUNTIME_DIR, TEST_DIR, device.mac_addr.replace(':', ''),
                     'monitor.pcap'), packet_capture)

    self._monitor_in_progress = False
    self.listener.call_callback(NetworkEvent.DEVICE_STABLE, device.mac_addr)

  def _get_device(self, mac_addr):
    for device in self._devices:
      if device.mac_addr == mac_addr:
        return device

    device = NetworkDevice(mac_addr=mac_addr)
    self._devices.append(device)
    return device

  def import_config(self, json_config):
    self._int_intf = json_config['network']['internet_intf']
    self._dev_intf = json_config['network']['device_intf']

    if RUNTIME_KEY in json_config:
      self._runtime = json_config[RUNTIME_KEY]
    if STARTUP_TIMEOUT_KEY in json_config:
      self._startup_timeout = json_config[STARTUP_TIMEOUT_KEY]
    if MONITOR_PERIOD_KEY in json_config:
      self._monitor_period = json_config[MONITOR_PERIOD_KEY]

  def _check_network_services(self):
    LOGGER.debug('Checking network modules...')
    for net_module in self._net_modules:
      if net_module.enable_container:
        LOGGER.debug('Checking network module: ' + net_module.display_name)
        success = self._ping(net_module)
        if success:
          LOGGER.debug(net_module.display_name + ' responded succesfully: ' +
                       str(success))
        else:
          LOGGER.error(net_module.display_name + ' failed to respond to ping')

  def _ping(self, net_module):
    host = net_module.net_config.ipv4_address
    namespace = 'tr-ctns-' + net_module.dir_name
    cmd = 'ip netns exec ' + namespace + ' ping -c 1 ' + str(host)
    success = util.run_command(cmd, output=False)
    return success

  def _create_private_net(self):
    client = docker.from_env()
    try:
      network = client.networks.get(PRIVATE_DOCKER_NET)
      network.remove()
    except docker.errors.NotFound:
      pass

    # TODO: These should be made into variables
    ipam_pool = docker.types.IPAMPool(subnet='100.100.0.0/16',
                                      iprange='100.100.100.0/24')

    ipam_config = docker.types.IPAMConfig(pool_configs=[ipam_pool])

    client.networks.create(PRIVATE_DOCKER_NET,
                           ipam=ipam_config,
                           internal=True,
                           check_duplicate=True,
                           driver='macvlan')

  def _ci_pre_network_create(self):
    """ Stores network properties to restore network after
        network creation and flushes internet interface
        """

    self._ethmac = subprocess.check_output(
        f'cat /sys/class/net/{self._int_intf}/address',
        shell=True).decode('utf-8').strip()
    self._gateway = subprocess.check_output(
        'ip route | head -n 1 | awk \'{print $3}\'',
        shell=True).decode('utf-8').strip()
    self._ipv4 = subprocess.check_output(
        f'ip a show {self._int_intf} | grep \"inet \" | awk \'{{print $2}}\'',
        shell=True).decode('utf-8').strip()
    self._ipv6 = subprocess.check_output(
        f'ip a show {self._int_intf} | grep inet6 | awk \'{{print $2}}\'',
        shell=True).decode('utf-8').strip()
    self._brd = subprocess.check_output(
        f'ip a show {self._int_intf} | grep \"inet \" | awk \'{{print $4}}\'',
        shell=True).decode('utf-8').strip()

  def _ci_post_network_create(self):
    """ Restore network connection after creating bridge """
    util.run_command(f'ip addr flush dev {self._int_intf}')
    util.run_command(f'ip addr add {self.ipv4} dev {INTERNET_BRIDGE}')
    util.run_command(f'ip route append default via {self._gateway} dev {INTERNET_BRIDGE}')
    util.run_command(f'echo "nameserver 8.8.8.8" > /etc/resolv.conf')
    util.run_command(f'ip link set {INTERNET_BRIDGE} up')
    util.run_command(f'dhclient -v -i {INTERNET_BRIDGE}')

  def create_net(self):
    LOGGER.info('Creating baseline network')

    if not util.interface_exists(self._int_intf) or not util.interface_exists(
        self._dev_intf):
      LOGGER.error('Configured interfaces are not ready for use. ' +
                   'Ensure both interfaces are connected.')
      sys.exit(1)

    if self._single_intf:
      self._ci_pre_network_create()

    # Remove IP from internet adapter
    util.run_command('ifconfig ' + self._int_intf + ' 0.0.0.0')

    # Setup the virtual network
    if not self._ovs.create_baseline_net(verify=True):
      LOGGER.error('Baseline network validation failed.')
      self.stop()
      sys.exit(1)

    if self._single_intf:
      self._ci_post_network_create()

    self._create_private_net()

    self.listener = Listener(self._dev_intf)
    self.listener.register_callback(self._device_discovered,
                                    [NetworkEvent.DEVICE_DISCOVERED])
    self.listener.register_callback(self._dhcp_lease_ack,
                                    [NetworkEvent.DHCP_LEASE_ACK])

  def load_network_modules(self):
    """Load network modules from module_config.json."""
    LOGGER.debug('Loading network modules from /' + NETWORK_MODULES_DIR)

    loaded_modules = 'Loaded the following network modules: '
    net_modules_dir = os.path.join(self._path, NETWORK_MODULES_DIR)

    for module_dir in os.listdir(net_modules_dir):

      if self._get_network_module(module_dir) is None:
        loaded_module = self._load_network_module(module_dir)
        loaded_modules += loaded_module.dir_name + ' '

    LOGGER.info(loaded_modules)

  def _load_network_module(self, module_dir):

    net_modules_dir = os.path.join(self._path, NETWORK_MODULES_DIR)

    net_module = NetworkModule()

    # Load module information
    with open(os.path.join(self._path, net_modules_dir, module_dir,
                           NETWORK_MODULE_METADATA),
              'r',
              encoding='UTF-8') as module_file_open:
      net_module_json = json.load(module_file_open)

    net_module.name = net_module_json['config']['meta']['name']
    net_module.display_name = net_module_json['config']['meta']['display_name']
    net_module.description = net_module_json['config']['meta']['description']
    net_module.dir = os.path.join(self._path, net_modules_dir, module_dir)
    net_module.dir_name = module_dir
    net_module.build_file = module_dir + '.Dockerfile'
    net_module.container_name = 'tr-ct-' + net_module.dir_name
    net_module.image_name = 'test-run/' + net_module.dir_name

    # Attach folder mounts to network module
    if 'docker' in net_module_json['config']:

      if 'mounts' in net_module_json['config']['docker']:
        for mount_point in net_module_json['config']['docker']['mounts']:
          net_module.mounts.append(
              Mount(target=mount_point['target'],
                    source=os.path.join(os.getcwd(), mount_point['source']),
                    type='bind'))

      if 'depends_on' in net_module_json['config']['docker']:
        depends_on_module = net_module_json['config']['docker']['depends_on']
        if self._get_network_module(depends_on_module) is None:
          self._load_network_module(depends_on_module)

    # Determine if this is a container or just an image/template
    if 'enable_container' in net_module_json['config']['docker']:
      net_module.enable_container = net_module_json['config']['docker'][
          'enable_container']

    # Determine if this is a template
    if 'template' in net_module_json['config']['docker']:
      net_module.template = net_module_json['config']['docker']['template']

    # Load network service networking configuration
    if net_module.enable_container:

      net_module.net_config.enable_wan = net_module_json['config']['network'][
          'enable_wan']
      net_module.net_config.ip_index = net_module_json['config']['network'][
          'ip_index']

      net_module.net_config.host = False if not 'host' in net_module_json[
          'config']['network'] else net_module_json['config']['network']['host']

      net_module.net_config.ipv4_address = self.network_config.ipv4_network[
          net_module.net_config.ip_index]
      net_module.net_config.ipv4_network = self.network_config.ipv4_network

      net_module.net_config.ipv6_address = self.network_config.ipv6_network[
          net_module.net_config.ip_index]
      net_module.net_config.ipv6_network = self.network_config.ipv6_network

    self._net_modules.append(net_module)
    return net_module

  def build_network_modules(self):
    LOGGER.info('Building network modules...')
    for net_module in self._net_modules:
      if not net_module.template:
        self._build_module(net_module)

  def _build_module(self, net_module):
    LOGGER.debug('Building network module ' + net_module.dir_name)
    client = docker.from_env()
    client.images.build(dockerfile=os.path.join(net_module.dir,
                                                net_module.build_file),
                        path=self._path,
                        forcerm=True,
                        tag='test-run/' + net_module.dir_name)

  def _get_network_module(self, name):
    for net_module in self._net_modules:
      if name in (net_module.display_name, net_module.name,
                  net_module.dir_name):
        return net_module
    return None

  def _start_network_service(self, net_module):

    LOGGER.debug('Starting net service ' + net_module.display_name)
    network = 'host' if net_module.net_config.host else PRIVATE_DOCKER_NET
    LOGGER.debug(f"""Network: {network}, image name: {net_module.image_name},
                     container name: {net_module.container_name}""")
    try:
      client = docker.from_env()
      net_module.container = client.containers.run(
          net_module.image_name,
          auto_remove=True,
          cap_add=['NET_ADMIN'],
          name=net_module.container_name,
          hostname=net_module.container_name,
          network=PRIVATE_DOCKER_NET,
          privileged=True,
          detach=True,
          mounts=net_module.mounts,
          environment={'HOST_USER': self._host_user})
    except docker.errors.ContainerError as error:
      LOGGER.error('Container run error')
      LOGGER.error(error)

    if network != 'host':
      self._attach_service_to_network(net_module)

  def _stop_service_module(self, net_module, kill=False):
    LOGGER.debug('Stopping Service container ' + net_module.container_name)
    try:
      container = self._get_service_container(net_module)
      if container is not None:
        if kill:
          LOGGER.debug('Killing container:' + net_module.container_name)
          container.kill()
        else:
          LOGGER.debug('Stopping container:' + net_module.container_name)
          container.stop()
        LOGGER.debug('Container stopped:' + net_module.container_name)
    except Exception as error:  # pylint: disable=W0703
      LOGGER.error('Container stop error')
      LOGGER.error(error)

  def _get_service_container(self, net_module):
    LOGGER.debug('Resolving service container: ' + net_module.container_name)
    container = None
    try:
      client = docker.from_env()
      container = client.containers.get(net_module.container_name)
    except docker.errors.NotFound:
      LOGGER.debug('Container ' + net_module.container_name + ' not found')
    except Exception as e:  # pylint: disable=W0703
      LOGGER.error('Failed to resolve container')
      LOGGER.error(e)
    return container

  def stop_networking_services(self, kill=False):
    LOGGER.info('Stopping network services')
    for net_module in self._net_modules:
      # Network modules may just be Docker images,
      # so we do not want to stop them
      if not net_module.enable_container:
        continue
      self._stop_service_module(net_module, kill)

  def start_network_services(self):
    LOGGER.info('Starting network services')

    os.makedirs(os.path.join(os.getcwd(), NET_DIR), exist_ok=True)

    for net_module in self._net_modules:

      # Network modules may just be Docker images,
      # so we do not want to start them as containers
      if not net_module.enable_container:
        continue

      self._start_network_service(net_module)

    LOGGER.info('All network services are running')
    self._check_network_services()

  def attach_test_module_to_network(self, test_module):
    LOGGER.debug('Attaching test module  ' + test_module.display_name +
                 ' to device bridge')

    # Device bridge interface example:
    # tr-d-t-baseline (Test Run Device Interface for Test container)
    bridge_intf = DEVICE_BRIDGE + '-t-' + test_module.dir_name

    # Container interface example:
    # tr-cti-baseline-test (Test Run Container Interface for test container)
    container_intf = 'tr-tci-' + test_module.dir_name

    # Container network namespace name
    container_net_ns = 'tr-test-' + test_module.dir_name

    # Create interface pair
    util.run_command('ip link add ' + bridge_intf + ' type veth peer name ' +
                     container_intf)

    # Add bridge interface to device bridge
    self._ovs.add_port(port=bridge_intf, bridge_name=DEVICE_BRIDGE)

    # Get PID for running container
    # TODO: Some error checking around missing PIDs might be required
    container_pid = util.run_command('docker inspect -f {{.State.Pid}} ' +
                                     test_module.container_name)[0]

    # Create symlink for container network namespace
    util.run_command('ln -sf /proc/' + container_pid +
                     '/ns/net /var/run/netns/' + container_net_ns)

    # Attach container interface to container network namespace
    util.run_command('ip link set ' + container_intf + ' netns ' +
                     container_net_ns)

    # Rename container interface name to veth0
    util.run_command('ip netns exec ' + container_net_ns + ' ip link set dev ' +
                     container_intf + ' name veth0')

    # Set MAC address of container interface
    util.run_command('ip netns exec ' + container_net_ns +
                     ' ip link set dev veth0 address 9a:02:57:1e:8f:' +
                     str(test_module.ip_index))

    # Set IP address of container interface
    ipv4_address = self.network_config.ipv4_network[test_module.ip_index]
    ipv6_address = self.network_config.ipv6_network[test_module.ip_index]

    ipv4_address_with_prefix = str(ipv4_address) + '/' + str(
        self.network_config.ipv4_network.prefixlen)
    ipv6_address_with_prefix = str(ipv6_address) + '/' + str(
        self.network_config.ipv6_network.prefixlen)

    util.run_command('ip netns exec ' + container_net_ns + ' ip addr add ' +
                     ipv4_address_with_prefix + ' dev veth0')

    util.run_command('ip netns exec ' + container_net_ns + ' ip addr add ' +
                     ipv6_address_with_prefix + ' dev veth0')

    # Set interfaces up
    util.run_command('ip link set dev ' + bridge_intf + ' up')
    util.run_command('ip netns exec ' + container_net_ns +
                     ' ip link set dev veth0 up')

  # TODO: Let's move this into a separate script? It does not look great
  def _attach_service_to_network(self, net_module):
    LOGGER.debug('Attaching net service ' + net_module.display_name +
                 ' to device bridge')

    # Device bridge interface example:
    # tr-di-dhcp (Test Run Device Interface for DHCP container)
    bridge_intf = DEVICE_BRIDGE + 'i-' + net_module.dir_name

    # Container interface example:
    # tr-cti-dhcp (Test Run Container Interface for DHCP container)
    container_intf = 'tr-cti-' + net_module.dir_name

    # Container network namespace name
    container_net_ns = 'tr-ctns-' + net_module.dir_name

    # Resolve the interface information
    mac_addr = '9a:02:57:1e:8f:' + str(net_module.net_config.ip_index)
    ipv4_addr = net_module.net_config.get_ipv4_addr_with_prefix()
    ipv6_addr = net_module.net_config.get_ipv6_addr_with_prefix()

    # Add and configure the interface container
    if not self._ip_ctrl.configure_container_interface(
        bridge_intf, container_intf, "veth0", container_net_ns, mac_addr,
        net_module.container_name, ipv4_addr, ipv6_addr):
      LOGGER.error('Failed to configure local networking for ' +
                   net_module.name + '. Exiting.')
      sys.exit(1)

    # Add bridge interface to device bridge
    if self._ovs.add_port(port=bridge_intf, bridge_name=DEVICE_BRIDGE):
      if not self._ovs.port_exists(bridge_name=DEVICE_BRIDGE, port=bridge_intf):
        LOGGER.error('Failed to add ' + net_module.name + ' to device bridge ' +
                     DEVICE_BRIDGE + '. Exiting.')
        sys.exit(1)

    if net_module.net_config.enable_wan:
      LOGGER.debug('Attaching net service ' + net_module.display_name +
                   ' to internet bridge')

      # Internet bridge interface example:
      # tr-ci-dhcp (Test Run Control (Internet) Interface for DHCP container)
      bridge_intf = INTERNET_BRIDGE + 'i-' + net_module.dir_name

      # Container interface example:
      # tr-cti-dhcp (Test Run Container Interface for DHCP container)
      container_intf = 'tr-cti-' + net_module.dir_name

      if not self._ip_ctrl.configure_container_interface(
          bridge_intf, container_intf, "eth1", container_net_ns, mac_addr):
        LOGGER.error('Failed to configure internet networking for ' +
                     net_module.name + '. Exiting.')
        sys.exit(1)

      # Attach bridge interface to internet bridge
      if self._ovs.add_port(port=bridge_intf, bridge_name=INTERNET_BRIDGE):
        if not self._ovs.port_exists(bridge_name=INTERNET_BRIDGE,
                                     port=bridge_intf):
          LOGGER.error('Failed to add ' + net_module.name +
                       ' to internet bridge ' + DEVICE_BRIDGE + '. Exiting.')
          sys.exit(1)

  def restore_net(self):

    LOGGER.info('Clearing baseline network')

    if hasattr(self, 'listener'
               ) and self.listener is not None and self.listener.is_running():
      self.listener.stop_listener()

    client = docker.from_env()

    # Stop all network containers if still running
    for net_module in self._net_modules:
      try:
        container = client.containers.get('tr-ct-' + net_module.dir_name)
        container.kill()
      except Exception:  # pylint: disable=W0703
        continue

    # Clear the virtual network
    self._ovs.restore_net()

    # Clean up any existing network artifacts
    self._ip_ctrl.clean_all()

    # Restart internet interface
    if util.interface_exists(self._int_intf):
      util.run_command('ip link set ' + self._int_intf + ' down')
      util.run_command('ip link set ' + self._int_intf + ' up')

    LOGGER.info('Network is restored')


class NetworkModule:
  """Define all the properties of a Network Module"""

  def __init__(self):
    self.name = None
    self.display_name = None
    self.description = None

    self.container = None
    self.container_name = None
    self.image_name = None
    self.template = False

    # Absolute path
    self.dir = None
    self.dir_name = None
    self.build_file = None
    self.mounts = []

    self.enable_container = True

    self.net_config = NetworkModuleNetConfig()


# The networking configuration for a network module


class NetworkModuleNetConfig:
  """Define all the properties of the network config
  for a network module"""

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


# Represents the current configuration of the network for the device bridge


class NetworkConfig:
  """Define all the properties of the network configuration"""

  # TODO: Let's get this from a configuration file
  def __init__(self):
    self.ipv4_network = ipaddress.ip_network('10.10.10.0/24')
    self.ipv6_network = ipaddress.ip_network('fd10:77be:4186::/64')
