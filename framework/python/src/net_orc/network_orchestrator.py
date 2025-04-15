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
import ipaddress
import json
import os
from scapy.all import sniff, wrpcap, BOOTP, AsyncSniffer
from scapy.error import Scapy_Exception
import shutil
import subprocess
import sys
import time
import traceback
from common import logger, util, mqtt
from common.statuses import TestrunStatus
from net_orc.listener import Listener
from net_orc.network_event import NetworkEvent
from net_orc.network_validator import NetworkValidator
from net_orc.ovs_control import OVSControl
from net_orc.ip_control import IPControl
from core.docker.network_docker_module import NetworkModule

LOGGER = logger.get_logger('net_orc')
RUNTIME_DIR = 'runtime'
TEST_DIR = 'test'
NET_DIR = 'runtime/network'
NETWORK_MODULES_DIR = 'modules/network'

MONITOR_PCAP = 'monitor.pcap'
NETWORK_MODULE_METADATA = 'conf/module_config.json'

DEVICE_BRIDGE = 'tr-d'
INTERNET_BRIDGE = 'tr-c'
PRIVATE_DOCKER_NET = 'tr-private-net'
CONTAINER_NAME = 'network_orchestrator'


class NetworkOrchestrator:
  """Manage and controls a virtual testing network."""

  def __init__(self, session):

    self._session = session
    self._monitor_in_progress = False
    self._monitor_packets = []
    self._listener = None
    self._net_modules = []

    self._path = os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.realpath(__file__))))))

    self.validator = NetworkValidator()
    self.network_config = NetworkConfig()
    self._ovs = OVSControl(self._session)
    self._ip_ctrl = IPControl()

    # Load subnet information into the session
    self._session.set_subnets(self.network_config.ipv4_network,
                              self.network_config.ipv6_network)

  def start(self):
    """Start the network orchestrator."""

    LOGGER.debug('Starting network orchestrator')

    # Delete the runtime/network directory
    shutil.rmtree(os.path.join(os.getcwd(), NET_DIR), ignore_errors=True)

    # Cleanup any old config files test files
    conf_runtime_dir = os.path.join(RUNTIME_DIR, 'conf')
    shutil.rmtree(conf_runtime_dir, ignore_errors=True)
    os.makedirs(conf_runtime_dir, exist_ok=True)

    # Copy the system config file to the runtime directory
    system_conf_runtime = os.path.join(conf_runtime_dir, 'system.json')
    with open(system_conf_runtime, 'w', encoding='utf-8') as f:
      json.dump(self.get_session().get_config(), f, indent=2)

    # Get all components ready
    self.load_network_modules()

    # Restore the network first if required
    self.stop(kill=True)

    self.start_network()

    return True

  def check_config(self):

    device_interface_ready = util.interface_exists(
        self._session.get_device_interface())
    internet_interface_ready = util.interface_exists(
        self._session.get_internet_interface())

    if 'single_intf' in self._session.get_runtime_params():
      # Check for device interface only
      if not device_interface_ready:
        LOGGER.error('Device interface is not ready for use. ' +
                     'Ensure device interface is connected.')
        return False
    else:
      if not device_interface_ready and not internet_interface_ready:
        LOGGER.error(
            'Both device and internet interfaces are not ready for use. ' +
            'Ensure both interfaces are connected.')
        return False
      elif not device_interface_ready:
        LOGGER.error('Device interface is not ready for use. ' +
                     'Ensure device interface is connected.')
        return False
      elif not internet_interface_ready:
        LOGGER.error('Internet interface is not ready for use. ' +
                     'Ensure internet interface is connected.')
        return False
    return True

  def start_network(self):
    """Start the virtual testing network."""
    LOGGER.info('Starting network')

    self.create_net()
    self.start_network_services()

    try:
      if 'validate' in self._session.get_runtime_params():
        # Start the validator after network is ready
        self._session.set_status(TestrunStatus.VALIDATING)
        self.validator.start()
        self.validator.stop()
    except Exception as e:  # pylint: disable=W0703
      LOGGER.error(f'Validation failed {e}')

    self._session.set_status('Waiting for Device')
    # Get network ready (via Network orchestrator)
    LOGGER.debug('Network is ready')

  def get_ip_address(self, iface):
    return self._ip_ctrl.get_ip_address(iface)

  def get_listener(self):
    return self._listener

  def start_listener(self):
    LOGGER.debug('Starting network listener')
    self.get_listener().start_listener()

  def stop(self, kill=False):
    """Stop the network orchestrator."""
    self.stop_validator(kill=kill)
    self.stop_network(kill=kill)

    # Listener may not have been defined yet
    if self.get_listener() is not None:
      self.get_listener().stop_listener()
      self.get_listener().reset()

  def stop_validator(self, kill=False):
    """Stop the network validator."""
    # Shutdown the validator
    self.validator.stop(kill=kill)

  def stop_network(self, kill=False):
    """Stop the virtual testing network."""
    # Shutdown network
    self.stop_networking_services(kill=kill)
    self.restore_net()

  def _device_discovered(self, mac_addr):

    device = self._session.get_device(mac_addr)

    if self._session.get_target_device() is not None:
      if mac_addr != self._session.get_target_device().mac_addr:
        # Ignore discovered device
        return

    self._get_port_stats(pre_monitor=True)
    self._monitor_in_progress = True

    LOGGER.debug(
        f'Discovered device {mac_addr}. Waiting for device to obtain IP')

    if device is None:
      LOGGER.debug(f'Device with MAC address {mac_addr} does not exist' +
                   ' in device repository')
      # Ignore device if not registered
      return

    # Cleanup any old test files
    test_dir = os.path.join(RUNTIME_DIR, TEST_DIR)
    device_tests = os.listdir(test_dir)
    for device_test in device_tests:
      device_test_path = os.path.join(RUNTIME_DIR, TEST_DIR, device_test)
      if os.path.isdir(device_test_path):
        shutil.rmtree(device_test_path, ignore_errors=True)

    device_runtime_dir = os.path.join(RUNTIME_DIR, TEST_DIR,
                                      mac_addr.replace(':', ''))
    os.makedirs(device_runtime_dir, exist_ok=True)

    util.run_command(f'chown -R {util.get_host_user()} {device_runtime_dir}')

    packet_capture = sniff(iface=self._session.get_device_interface(),
                           timeout=self._session.get_startup_timeout(),
                           stop_filter=self._device_has_ip)
    wrpcap(os.path.join(device_runtime_dir, 'startup.pcap'), packet_capture)

    # Copy the device config file to the runtime directory
    runtime_device_conf = os.path.join(device_runtime_dir, 'device_config.json')
    with open(runtime_device_conf, 'w', encoding='utf-8') as f:
      json.dump(self._session.get_target_device().to_config_json(), f, indent=2)

    self._get_conn_stats()

    if device.ip_addr is None:
      LOGGER.info(
          f'Timed out whilst waiting for {mac_addr} to obtain an IP address')
      self._session.set_status(TestrunStatus.CANCELLED)
      return
    LOGGER.info(
        f'Device with mac addr {device.mac_addr} has obtained IP address '
        f'{device.ip_addr}')
    #self._ovs.add_arp_inspection_filter(ip_address=device.ip_addr,
    #  mac_address=device.mac_addr)

    # Don't monitor devices when in network only mode
    if 'net_only' not in self._session.get_runtime_params():
      self._start_device_monitor(device)

  def _get_conn_stats(self):
    """ Extract information about the physical connection
    and store it to a file for the conn test module to access"""
    dev_int = self._session.get_device_interface()
    conn_stats = self._ip_ctrl.get_iface_connection_stats(dev_int)
    if conn_stats is not None:
      eth_out_file = os.path.join(NET_DIR, 'ethtool_conn_stats.txt')
      with open(eth_out_file, 'w', encoding='utf-8') as f:
        f.write(conn_stats)
    else:
      LOGGER.error('Failed to generate connection stats')

  def _get_port_stats(self, pre_monitor=True):
    """ Extract information about the port statistics
    and store it to a file for the conn test module to access"""
    suffix = 'pre_monitor' if pre_monitor else 'post_monitor'
    dev_int = self._session.get_device_interface()
    ethtool_port_stats = self._ip_ctrl.get_iface_ethtool_port_stats(dev_int)
    ifconfig_port_stats = self._ip_ctrl.get_iface_ifconfig_port_stats(dev_int)
    if ethtool_port_stats is not None:
      ethtool_out_file = os.path.join(NET_DIR,
                                      f'ethtool_port_stats_{suffix}.txt')
      with open(ethtool_out_file, 'w', encoding='utf-8') as f:
        f.write(ethtool_port_stats)
    if ifconfig_port_stats is not None:
      ifconfig_out_file = os.path.join(NET_DIR,
                                       f'ifconfig_port_stats_{suffix}.txt')
      with open(ifconfig_out_file, 'w', encoding='utf-8') as f:
        f.write(ifconfig_port_stats)
    if ethtool_port_stats is None and ifconfig_port_stats is None:
      LOGGER.error('Failed to generate port stats')

  def monitor_in_progress(self):
    return self._monitor_in_progress

  def _device_has_ip(self, packet):
    device = self._session.get_device(mac_addr=packet.src)
    if device is None or device.ip_addr is None:
      return False
    return True

  def _dhcp_lease_ack(self, packet):
    mac_addr = packet[BOOTP].chaddr.hex(':')[0:17]
    device = self._session.get_device(mac_addr=mac_addr)

    # Ignore devices that are not registered
    if device is None:
      return

    # TODO: Check if device is None
    device.ip_addr = packet[BOOTP].yiaddr

  def _start_device_monitor(self, device):
    """Start a timer until the steady state has been reached and
        callback the steady state method for this device."""
    self.get_session().set_status(TestrunStatus.MONITORING)
    self._monitor_packets = []
    LOGGER.info(f'Monitoring device with mac addr {device.mac_addr} '
                f'for {str(self._session.get_monitor_period())} seconds')

    device_runtime_dir = os.path.join(RUNTIME_DIR, TEST_DIR,
                                      device.mac_addr.replace(':', ''))

    sniffer = AsyncSniffer(iface=self._session.get_device_interface(),
                           timeout=self._session.get_monitor_period(),
                           prn=self._monitor_packet_callback)
    sniffer.start()

    while sniffer.running:
      time.sleep(1)

      # Check Testrun hasn't been cancelled
      if self._session.get_status() in (TestrunStatus.STOPPING,
                                        TestrunStatus.CANCELLED):
        sniffer.stop()
        return

      if not self._ip_ctrl.check_interface_status(
          self._session.get_device_interface()):
        try:
          sniffer.stop()
        except Scapy_Exception:
          LOGGER.error('Device adapter disconnected whilst monitoring.')
        finally:
          self._session.set_status(TestrunStatus.CANCELLED)
          LOGGER.error('Device interface disconnected, cancelling Testrun')

    LOGGER.debug('Writing packets to monitor.pcap')
    wrpcap(os.path.join(device_runtime_dir, 'monitor.pcap'),
           self._monitor_packets)
    self._monitor_in_progress = False
    self._get_port_stats(pre_monitor=False)
    self.get_listener().call_callback(NetworkEvent.DEVICE_STABLE,
                                      device.mac_addr)

  def _monitor_packet_callback(self, packet):
    self._monitor_packets.append(packet)

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

  def _ci_pre_network_create(self):
    """ Stores network properties to restore network after
        network creation and flushes internet interface
        """
    LOGGER.info('Pre network create')
    self._ethmac = subprocess.check_output(
        f'cat /sys/class/net/{self._session.get_internet_interface()}/address',
        shell=True).decode('utf-8').strip()
    self._gateway = subprocess.check_output(
        'ip route | head -n 1 | awk \'{print $3}\'',
        shell=True).decode('utf-8').strip()
    self._ipv4 = subprocess.check_output(
        (f'ip a show {self._session.get_internet_interface()} | ' +
         'grep \"inet \" | awk \'{{print $2}}\''),
        shell=True).decode('utf-8').strip()
    self._ipv6 = subprocess.check_output(
        (f'ip a show {self._session.get_internet_interface()} | grep inet6 | ' +
         'awk \'{{print $2}}\''),
        shell=True).decode('utf-8').strip()
    self._brd = subprocess.check_output(
        (f'ip a show {self._session.get_internet_interface()} | grep \"inet \" '
         + '| awk \'{{print $4}}\''),
        shell=True).decode('utf-8').strip()

  def _ci_post_network_create(self):
    """ Restore network connection in CI environment """
    LOGGER.info('Post network create')
    util.run_command(((f'ip address del {self._ipv4} ' +
                       'dev {self._session.get_internet_interface()}')))
    util.run_command((f'ip -6 address del {self._ipv6} ' +
                      'dev {self._session.get_internet_interface()}'))
    util.run_command(
        (f'ip link set dev {self._session.get_internet_interface()} ' +
         'address 00:B0:D0:63:C2:26'))
    util.run_command(
        f'ip addr flush dev {self._session.get_internet_interface()}')
    util.run_command(
        f'ip addr add dev {self._session.get_internet_interface()} 0.0.0.0')
    util.run_command(
        f'ip addr add dev {INTERNET_BRIDGE} {self._ipv4} broadcast {self._brd}')
    util.run_command(f'ip -6 addr add {self._ipv6} dev {INTERNET_BRIDGE} ')
    util.run_command(
        f'systemd-resolve --interface {INTERNET_BRIDGE} --set-dns 8.8.8.8')
    util.run_command(f'ip link set dev {INTERNET_BRIDGE} up')
    util.run_command(f'dhclient {INTERNET_BRIDGE}')
    util.run_command('ip route del default via 10.1.0.1')
    util.run_command(f'ip route add default via {self._gateway} '
                     f'src {self._ipv4[:-3]} metric 100 dev {INTERNET_BRIDGE}')

  def create_net(self):
    LOGGER.info('Creating baseline network')

    if 'CI' in os.environ:
      self._ci_pre_network_create()

    # Setup the virtual network
    if not self._ovs.create_baseline_net(verify=True):
      LOGGER.error('Baseline network validation failed.')
      self.stop()
      sys.exit(1)

    if 'CI' in os.environ:
      self._ci_post_network_create()

    # Private network not used, disable until
    # a use case is determined
    #self._create_private_net()

    self._listener = Listener(self._session)

    self.get_listener().register_callback(self._device_discovered,
                                          [NetworkEvent.DEVICE_DISCOVERED])
    self.get_listener().register_callback(self._dhcp_lease_ack,
                                          [NetworkEvent.DHCP_LEASE_ACK])

  def load_network_modules(self):
    """Load network modules from module_config.json."""
    LOGGER.debug('Loading network modules from /' + NETWORK_MODULES_DIR)

    loaded_modules = 'Loaded the following network modules: '
    net_modules_dir = os.path.join(self._path, NETWORK_MODULES_DIR)

    for module_dir in os.listdir(net_modules_dir):

      if (self._get_network_module(module_dir) is None
          and module_dir != 'template'):
        loaded_module = self._load_network_module(module_dir)
        loaded_modules += loaded_module.dir_name + ' '

    LOGGER.info(loaded_modules)

  def _load_network_module(self, module_dir):
    """Import module configuration from module_config.json."""

    # Make sure we only load each module once since some modules will
    # depend on the same module
    if not any(m.dir_name == module_dir for m in self._net_modules):

      LOGGER.debug(f'Loading network module {module_dir}')

      modules_dir = os.path.join(self._path, NETWORK_MODULES_DIR)

      module_conf_file = os.path.join(self._path, modules_dir, module_dir,
                                      NETWORK_MODULE_METADATA)

      module = NetworkModule(module_conf_file, self._session)
      if module.depends_on is not None:
        self._load_network_module(module.depends_on)
      self._net_modules.append(module)

      return module

  def build_network_modules(self):
    LOGGER.info('Building network modules...')
    for net_module in self._net_modules:
      if not net_module.template:
        self._build_module(net_module)

  def _build_module(self, net_module):
    LOGGER.debug('Building network module ' + net_module.dir_name)
    net_module.build()

  def _get_network_module(self, name):
    for net_module in self._net_modules:
      if name in (net_module.display_name, net_module.name,
                  net_module.dir_name):
        return net_module
    return None

  def _start_network_service(self, net_module):

    LOGGER.debug('Starting network service ' + net_module.display_name)
    network = 'host' if net_module.net_config.host else 'bridge'
    LOGGER.debug(f"""Network: {network}, image name: {net_module.image_name},
                     container name: {net_module.container_name}""")

    net_module.start()
    if net_module.get_network() != 'host':
      self._attach_service_to_network(net_module)

  def _stop_service_module(self, net_module, kill=False):
    LOGGER.debug('Stopping network container ' + net_module.container_name)
    net_module.stop(kill=kill)

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
        bridge_intf, container_intf, 'veth0', container_net_ns, mac_addr,
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
          bridge_intf, container_intf, 'eth1', container_net_ns, mac_addr):
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

  def remove_arp_filters(self):
    LOGGER.info('Removing ARP inspection filters')
    self._ovs.delete_arp_inspection_filter()

  def restore_net(self):

    LOGGER.info('Clearing baseline network')

    if self.get_listener() is not None and self.get_listener().is_running():
      self.get_listener().stop_listener()

    # Stop all network containers if still running
    for net_module in self._net_modules:
      try:
        net_module.stop(kill=True)
      except Exception:  # pylint: disable=W0703
        continue

    # Clear the virtual network
    self._ovs.restore_net()

    # Clean up any existing network artifacts
    self._ip_ctrl.clean_all()

    internet_intf = self._session.get_internet_interface()

    # Restart internet interface
    if util.interface_exists(internet_intf):
      util.run_command('ip link set ' + internet_intf + ' down')
      util.run_command('ip link set ' + internet_intf + ' up')

    LOGGER.info('Network is restored')

  def get_session(self):
    return self._session

  def network_adapters_checker(self, mqtt_client: mqtt.MQTT, topic: str):
    """Checks for changes in network adapters
    and sends a message to the frontend
    """
    try:
      adapters = self._session.detect_network_adapters_change()
      if adapters:
        mqtt_client.send_message(topic, adapters)
    except Exception:  # pylint: disable=W0703
      LOGGER.error(traceback.format_exc())

  def is_device_connected(self):
    """Check if device connected"""
    return self._ip_ctrl.check_interface_status(
        self._session.get_device_interface())

  def internet_conn_checker(self, mqtt_client: mqtt.MQTT, topic: str):
    """Checks internet connection and sends a status to frontend"""

    # Default message
    message = {'connection': False}

    # Only check if Testrun is running
    if self.get_session().get_status() not in [
        TestrunStatus.WAITING_FOR_DEVICE, TestrunStatus.MONITORING,
        TestrunStatus.IN_PROGRESS, TestrunStatus.STARTING
    ]:
      message['connection'] = None

    # Only run if single intf mode not used
    elif 'single_intf' not in self._session.get_runtime_params():
      iface = self._session.get_internet_interface()

      # Check that an internet intf has been selected
      if iface and iface in self._ip_ctrl.get_sys_interfaces():

        # Ping google.com from gateway container
        internet_connection = self._ip_ctrl.ping_via_gateway('google.com')

        if internet_connection:
          message['connection'] = True

      # Broadcast via MQTT client
      mqtt_client.send_message(topic, message)


class NetworkConfig:
  """Define all the properties of the network configuration"""

  # TODO: Let's get this from a configuration file
  def __init__(self):
    self.ipv4_network = ipaddress.ip_network('10.10.10.0/24')
    self.ipv6_network = ipaddress.ip_network('fd10:77be:4186::/64')
