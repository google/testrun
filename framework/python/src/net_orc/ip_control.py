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
"""IP Control Module"""
import psutil
import typing as t
from common import logger
from common import util
import re
import socket

LOGGER = logger.get_logger('ip_ctrl')


class IPControl:
  """IP Control"""

  def __init__(self):
    """Initialize the IPControl object"""

  def add_link(self, interface_name, peer_name):
    """Create an ip link with a peer"""
    success = util.run_command('ip link add ' + interface_name +
                               ' type veth peer name ' + peer_name)
    return success

  def add_namespace(self, namespace):
    """Add a network namespace"""
    exists = self.namespace_exists(namespace)
    LOGGER.info('Namespace exists: ' + str(exists))
    if exists:
      return True
    else:
      success = util.run_command('ip netns add ' + namespace)
      return success

  def check_interface_status(self, interface_name):
    output = util.run_command(cmd=f'ip link show {interface_name}', output=True)
    return 'state UP ' in output[0]

  def delete_link(self, interface_name):
    """Delete an ip link"""
    success = util.run_command('ip link delete ' + interface_name)
    return success

  def delete_namespace(self, interface_name):
    """Delete an ip namespace"""
    success = util.run_command('ip netns delete ' + interface_name)
    return success

  def link_exists(self, link_name):
    links = self.get_links()
    return link_name in links

  def namespace_exists(self, namespace):
    """Check if a namespace already exists"""
    namespaces = self.get_namespaces()
    return namespace in namespaces

  def get_links(self):
    result = util.run_command('ip link list')
    links = result[0].strip().split('\n')
    netns_links = []
    for link in links:
      match = re.search(r'\d+:\s+(\S+)', link)
      if match:
        interface_name = match.group(1)
        name_match = re.search(r'(.*)@', interface_name)
        if name_match:
          interface_name = name_match.group(1)
        netns_links.append(interface_name.strip())
    return netns_links

  def get_iface_connection_stats(self, iface):
    """Extract information about the physical connection"""
    response = util.run_command(f'ethtool {iface}')
    if len(response[1]) == 0:
      return response[0]
    else:
      return None

  @staticmethod
  def get_iface_mac_address(iface):
    net_if_addrs = psutil.net_if_addrs()
    if iface in net_if_addrs:
      for addr_info in net_if_addrs[iface]:
        # AF_LINK corresponds to the MAC address
        if addr_info.family == psutil.AF_LINK:
          return addr_info.address
    return None

  def get_iface_ethtool_port_stats(self, iface):
    """Extract information about packets connection"""
    response = util.run_command(f'ethtool -S {iface}')
    if len(response[1]) == 0:
      return response[0]
    else:
      return None

  def get_iface_ifconfig_port_stats(self, iface):
    """Extract information about packets connection"""
    response = util.run_command(f'ifconfig -a {iface}')
    if len(response[1]) == 0:
      return response[0]
    else:
      return None

  def get_ip_address(self, iface):
    addrs = psutil.net_if_addrs()
    if iface in addrs:
      for addr in addrs[iface]:
        if addr.family == socket.AF_INET:
          return addr.address
    return None

  def get_namespaces(self):
    result = util.run_command('ip netns list')
    # Strip ID's from the namespace results
    namespaces = re.findall(r'(\S+)(?:\s+\(id: \d+\))?', result[0])
    return namespaces

  def set_namespace(self, interface_name, namespace):
    """Attach an interface to a network namespace"""
    success = util.run_command('ip link set ' + interface_name + ' netns ' +
                               namespace)
    return success

  def rename_interface(self, interface_name, namespace, new_name):
    """Rename an interface"""
    success = util.run_command('ip netns exec ' + namespace +
                               ' ip link set dev ' + interface_name + ' name ' +
                               new_name)
    return success

  def set_interface_mac(self, interface_name, namespace, mac_addr):
    """Set MAC address of an interface"""
    success = util.run_command('ip netns exec ' + namespace +
                               ' ip link set dev ' + interface_name +
                               ' address ' + mac_addr)
    return success

  def set_interface_ip(self, interface_name, namespace, ipaddr):
    """Set IP address of an interface"""
    success = util.run_command('ip netns exec ' + namespace + ' ip addr add ' +
                               ipaddr + ' dev ' + interface_name)
    return success

  def set_interface_up(self, interface_name, namespace=None):
    """Set the interface to the up state"""
    if namespace is None:
      success = util.run_command('ip link set dev ' + interface_name + ' up')
    else:
      success = util.run_command('ip netns exec ' + namespace +
                                 ' ip link set dev ' + interface_name + ' up')
    return success

  def clean_all(self):
    """Cleanup all existing test run interfaces and namespaces"""

    # Delete all namesapces that start with tr
    namespaces = self.get_namespaces()
    for ns in namespaces:
      if 'tr' in ns:
        self.delete_namespace(ns)

    # Delete all namespaces that start with tr
    links = self.get_links()
    for link in links:
      if 'tr' in link:
        self.delete_link(link)

  def cleanup(self, interface=None, namespace=None):
    """Cleanup existing link and namespace if they still exist"""

    link_clean = True
    if interface is not None:
      if self.link_exists(interface):
        link_clean = self.delete_link(interface)

    ns_clean = True
    if namespace is not None:
      if self.namespace_exists(namespace):
        ns_clean = self.delete_namespace
    return link_clean and ns_clean

  def configure_container_interface(self,
                                    bridge_intf,
                                    container_intf,
                                    namespace_intf,
                                    namespace,
                                    mac_addr,
                                    container_name=None,
                                    ipv4_addr=None,
                                    ipv6_addr=None):

    # Cleanup old interface and namespaces
    self.cleanup(bridge_intf, namespace)

    # Create interface pair
    self.add_link(bridge_intf, container_intf)

    if container_name is not None:
      # Get PID for running container
      # TODO: Some error checking around missing PIDs might be required
      container_pid = util.run_command('docker inspect -f {{.State.Pid}} ' +
                                       container_name)[0]
      if not container_pid.isdigit():
        LOGGER.error(f'Failed to resolve pid for {container_name}')
        return False

      # Create symlink for container network namespace
      if not util.run_command('ln -sf /proc/' + container_pid +
                              '/ns/net /var/run/netns/' + namespace,
                              output=False):
        LOGGER.error(
            f'Failed to link {container_name} to namespace {namespace_intf}')
        return False

    # Attach container interface to container network namespace
    if not self.set_namespace(container_intf, namespace):
      LOGGER.error(f'Failed to set namespace {namespace} for {container_intf}')
      return False

    # Rename container interface name
    if not self.rename_interface(container_intf, namespace, namespace_intf):
      LOGGER.error((f'Failed to rename container interface {container_intf} ' +
                    'to {namespace_intf}'))
      return False

    # Set MAC address of container interface
    if not self.set_interface_mac(namespace_intf, namespace, mac_addr):
      LOGGER.error(
          f'Failed to set MAC address for {namespace_intf} to {mac_addr}')
      return False

    # Set IP address of container interface
    if ipv4_addr is not None:
      if not self.set_interface_ip(namespace_intf, namespace, ipv4_addr):
        LOGGER.error(
            f'Failed to set IPv4 address for {namespace_intf} to {ipv4_addr}')
        return False
    if ipv6_addr is not None:
      if not self.set_interface_ip(namespace_intf, namespace, ipv6_addr):
        LOGGER.error(
            f'Failed to set IPv6 address for {namespace_intf} to {ipv6_addr}')
        return False

    # Set interfaces up
    if not self.set_interface_up(bridge_intf):
      LOGGER.error(f'Failed to set interface up {bridge_intf}')
      return False
    if not self.set_interface_up(namespace_intf, namespace):
      LOGGER.error(f'Failed to set interface up {namespace_intf}')
      return False
    return True

  def ping_via_gateway(self, host):
    """Ping the host trough the gateway container"""
    command = f'timeout 3 docker exec tr-ct-gateway ping -W 1 -c 1 {host}'
    output = util.run_command(command, supress_error=True)
    if '0% packet loss' in output[0]:
      return True
    return False

  @staticmethod
  def get_sys_interfaces() -> t.Dict[str, t.Dict[str, str]]:
    """ Retrieves all Ethernet network interfaces from the host system
    Returns:
        t.Dict[str, str]
    """
    addrs = psutil.net_if_addrs()
    ifaces = {}

    for key in addrs:
      nic = addrs[key]
      # Ignore any interfaces that are not ethernet
      if not (key.startswith('en') or key.startswith('eth')):
        continue

      ifaces[key] = nic[0].address

    return ifaces
