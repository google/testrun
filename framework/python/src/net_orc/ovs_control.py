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

"""OVS Control Module"""
import json
import os
from common import logger
from common import util

CONFIG_FILE = 'local/system.json'
DEVICE_BRIDGE = 'tr-d'
INTERNET_BRIDGE = 'tr-c'
LOGGER = logger.get_logger('ovs_ctrl')


class OVSControl:
  """OVS Control"""

  def __init__(self):
    self._int_intf = None
    self._dev_intf = None
    self._load_config()

  def add_bridge(self, bridge_name):
    LOGGER.debug('Adding OVS bridge: ' + bridge_name)
    # Create the bridge using ovs-vsctl commands
    # Uses the --may-exist option to prevent failures
    # if this bridge already exists by this name it won't fail
    # and will not modify the existing bridge
    success = util.run_command('ovs-vsctl --may-exist add-br ' + bridge_name)
    return success

  def add_flow(self, bridge_name, flow):
    # Add a flow to the bridge using ovs-ofctl commands
    LOGGER.debug(f'Adding flow {flow} to bridge: {bridge_name}')
    success = util.run_command(f'ovs-ofctl add-flow {bridge_name} \'{flow}\'')
    return success

  def add_port(self, port, bridge_name):
    LOGGER.debug('Adding port ' + port + ' to OVS bridge: ' + bridge_name)
    # Add a port to the bridge using ovs-vsctl commands
    # Uses the --may-exist option to prevent failures
    # if this port already exists on the bridge and will not
    # modify the existing bridge
    success = util.run_command(f"""ovs-vsctl --may-exist
                             add-port {bridge_name} {port}""")
    return success

  def get_bridge_ports(self, bridge_name):
    # Get a list of all the ports on a bridge
    response = util.run_command(f'ovs-vsctl list-ports {bridge_name}',
                                output=True)
    return response[0].splitlines()

  def bridge_exists(self, bridge_name):
    # Check if a bridge exists by the name provided
    LOGGER.debug(f'Checking if {bridge_name} exists')
    success = util.run_command(f'ovs-vsctl br-exists {bridge_name}')
    return success

  def port_exists(self, bridge_name, port):
    # Check if a port exists on a specified bridge
    LOGGER.debug(f'Checking if {bridge_name} exists')
    resp = util.run_command(f'ovs-vsctl port-to-br {port}', True)
    return resp[0] == bridge_name

  def validate_baseline_network(self):
    # Verify the OVS setup of the virtual network
    LOGGER.debug('Validating baseline network')

    # Verify the device bridge
    dev_bridge = self.verify_bridge(DEVICE_BRIDGE, [self._dev_intf])
    LOGGER.debug('Device bridge verified: ' + str(dev_bridge))

    # Verify the internet bridge
    int_bridge = self.verify_bridge(INTERNET_BRIDGE, [self._int_intf])
    LOGGER.debug('Internet bridge verified: ' + str(int_bridge))

    return dev_bridge and int_bridge

  def verify_bridge(self, bridge_name, ports):
    LOGGER.debug('Verifying bridge: ' + bridge_name)
    verified = True
    if self.bridge_exists(bridge_name):
      bridge_ports = self.get_bridge_ports(bridge_name)
      LOGGER.debug('Checking bridge for ports: ' + str(ports))
      for port in ports:
        if port not in bridge_ports:
          verified = False
          break
    else:
      verified = False
    return verified

  def create_baseline_net(self, verify=True):
    LOGGER.debug('Creating baseline network')

    # Remove IP from internet adapter
    self.set_interface_ip(interface=self._int_intf, ip_addr='0.0.0.0')

    # Create data plane
    self.add_bridge(DEVICE_BRIDGE)

    # Create control plane
    self.add_bridge(INTERNET_BRIDGE)

    # Remove IP from internet adapter
    self.set_interface_ip(self._int_intf, '0.0.0.0')

    # Add external interfaces to data and control plane
    self.add_port(self._dev_intf, DEVICE_BRIDGE)
    self.add_port(self._int_intf, INTERNET_BRIDGE)

    # Enable forwarding of eapol packets
    self.add_flow(bridge_name=DEVICE_BRIDGE,
                  flow='table=0, dl_dst=01:80:c2:00:00:03, actions=flood')

    # Set ports up
    self.set_bridge_up(DEVICE_BRIDGE)
    self.set_bridge_up(INTERNET_BRIDGE)

    self.show_config()

    if verify:
      return self.validate_baseline_network()
    else:
      return None

  def delete_bridge(self, bridge_name):
    LOGGER.debug('Deleting OVS Bridge: ' + bridge_name)
    # Delete the bridge using ovs-vsctl commands
    # Uses the --if-exists option to prevent failures
    # if this bridge does not exists
    success = util.run_command('ovs-vsctl --if-exists del-br ' + bridge_name)
    return success

  def _load_config(self):
    path = os.path.dirname(os.path.dirname(
          os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.realpath(__file__))))))
    config_file = os.path.join(path, CONFIG_FILE)
    LOGGER.debug('Loading configuration: ' + config_file)
    with open(config_file, 'r', encoding='utf-8') as conf_file:
      config_json = json.load(conf_file)
    self._int_intf = config_json['network']['internet_intf']
    self._dev_intf = config_json['network']['device_intf']
    LOGGER.debug('Configuration loaded')
    LOGGER.debug('Internet interface: ' + self._int_intf)
    LOGGER.debug('Device interface: ' + self._dev_intf)

  def restore_net(self):
    LOGGER.debug('Restoring network...')
    # Delete data plane
    self.delete_bridge(DEVICE_BRIDGE)

    # Delete control plane
    self.delete_bridge(INTERNET_BRIDGE)

    LOGGER.debug('Network is restored')

  def show_config(self):
    LOGGER.debug('Show current config of OVS')
    success = util.run_command('ovs-vsctl show', output=True)
    LOGGER.debug(f'OVS Config\n{success[0]}')
    return success

  def set_bridge_up(self, bridge_name):
    LOGGER.debug('Setting bridge device to up state: ' + bridge_name)
    success = util.run_command('ip link set dev ' + bridge_name + ' up')
    return success

  def set_interface_ip(self, interface, ip_addr):
    LOGGER.debug('Setting interface ' + interface + ' to ' + ip_addr)
    # Remove IP from internet adapter
    util.run_command(f'ifconfig {interface} {ip_addr}')
