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
from common import logger
from common import util
import re

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
    if exists:
      return True
    else:
      success = util.run_command('ip netns add ' + namespace)
      return success

  def namespace_exists(self,namespace):
    """Check if a namespace already exists"""
    namespaces = self.get_namespaces()
    if namespace in namespaces:
      return True
    else:
      return False

  def get_namespaces(self):
    stdout,stderr = util.run_command('ip netns list')
    #Strip ID's from the namespace results
    namespaces = re.findall(r'(\S+)(?:\s+\(id: \d+\))?', stdout)
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

  def configure_container_interface(self,bridge_intf, container_intf,
                                    namespace_intf, namespace, mac_addr,
                                    ipv4_addr, ipv6_addr):

    # Create the interface pair
    #self.add_link(bridge_intf,container_inf)

    # Add the network namespace
    self.add_namespace(namespace)

    # Attach container interface to container network namespace
    self.set_namespace(container_intf, namespace)

    # Rename container interface name
    self.rename_interface(container_intf,namespace, namespace_intf)

    # Set MAC address of container interface
    self.set_interface_mac(namespace_intf, namespace, mac_addr)

    # Set IP address of container interface
    self.set_interface_ip(namespace_intf, namespace, ipv4_addr)
    self.set_interface_ip(namespace_intf, namespace, ipv6_addr)

    # Set interfaces up
    self.set_interface_up(bridge_intf)
    self.set_interface_up(namespace_intf, namespace)
