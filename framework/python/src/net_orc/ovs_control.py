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
from common import logger
from common import util

DEVICE_BRIDGE = 'tr-d'
INTERNET_BRIDGE = 'tr-c'
LOGGER = logger.get_logger('ovs_ctrl')


class OVSControl:
  """OVS Control"""

  def __init__(self, session):
    self._session = session

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

  def delete_flow(self, bridge_name, flow):
    # Delete a flow from the bridge using ovs-ofctl commands
    LOGGER.debug(f'Deleting flow {flow} from bridge: {bridge_name}')
    success = util.run_command(f'ovs-ofctl del-flows {bridge_name} \'{flow}\'')
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

    dev_bridge = True
    int_bridge = True

    # Verify the device bridge
    dev_bridge = self.verify_bridge(DEVICE_BRIDGE,
                                    [self._session.get_device_interface()])
    LOGGER.debug('Device bridge verified: ' + str(dev_bridge))

    # Verify the internet bridge
    if 'single_intf' not in self._session.get_runtime_params():
      int_bridge = self.verify_bridge(INTERNET_BRIDGE,
                                      [self._session.get_internet_interface()])
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

    # Create data plane
    self.add_bridge(DEVICE_BRIDGE)

    # Create control plane
    self.add_bridge(INTERNET_BRIDGE)

    # Add external interfaces to data and control plane
    self.add_port(self._session.get_device_interface(), DEVICE_BRIDGE)

    # Remove IP from internet adapter
    if not 'single_intf' in self._session.get_runtime_params():
      self.set_interface_ip(interface=self._session.get_internet_interface(),
                            ip_addr='0.0.0.0')
      self.add_port(self._session.get_internet_interface(), INTERNET_BRIDGE)

    # Enable forwarding of eapol packets
    self.add_flow(bridge_name=DEVICE_BRIDGE,
                  flow='table=0, dl_dst=01:80:c2:00:00:03, actions=flood')

    # Add a DHCP snooping equivalent to the device bridge
    # ToDo Define these IP's dynamically
    dhcp_server_primary_ip = '10.10.10.2'
    dhcp_server_secondary_ip = '10.10.10.3'
    self.add_dhcp_filters(dhcp_server_primary_ip=dhcp_server_primary_ip,
      dhcp_server_secondary_ip=dhcp_server_secondary_ip)

    # Set ports up
    self.set_bridge_up(DEVICE_BRIDGE)
    self.set_bridge_up(INTERNET_BRIDGE)

    self.show_config()

    if verify:
      return self.validate_baseline_network()
    else:
      return None

  def add_dhcp_filters(self,dhcp_server_primary_ip,dhcp_server_secondary_ip):

    # Allow DHCP traffic from primary server
    allow_primary_dhcp_server = (
      f'table=0, dl_type=0x800, priority=65535, tp_src=67, tp_dst=68, nw_src={dhcp_server_primary_ip}, actions=normal')
    self.add_flow(bridge_name=DEVICE_BRIDGE,flow=allow_primary_dhcp_server)

    # Allow DHCP traffic from secondary server
    allow_secondary_dhcp_server = (
      f'table=0, dl_type=0x800, priority=65535, tp_src=67, tp_dst=68, nw_src={dhcp_server_secondary_ip}, actions=normal')
    self.add_flow(bridge_name=DEVICE_BRIDGE,flow=allow_secondary_dhcp_server)

    # Drop DHCP packets not associated with known servers
    drop_dhcp_flow = 'table=0, dl_type=0x800, priority=0, tp_src=67, tp_dst=68, actions=drop'
    self.add_flow(bridge_name=DEVICE_BRIDGE,flow=drop_dhcp_flow)

  def add_arp_inspection_filter(self,ip_address,mac_address):
    # Combine IP address and MAC address
    combined_str = ip_address + mac_address

    # Convert combined string to integer
    cookie_value = int(combined_str.replace(':', '').replace('.', ''))

    # Allow ARP packets with known MAC-to-IP mappings
    drop_bad_arp= f'table=0, cookie={cookie_value}, priority=65535, arp, arp_tpa={ip_address}, arp_tha={mac_address}, action=normal'
    self.add_flow(bridge_name=DEVICE_BRIDGE,flow=drop_bad_arp)

    # Drop ARP packets with unknown MAC-to-IP mappings
    drop_unknown_arps = (
        f'table=0, priority=0, arp, '
        f'action=drop'
    )
    self.add_flow(bridge_name=DEVICE_BRIDGE,flow=drop_unknown_arps)

  def delete_arp_inspection_filter(self,ip_address,mac_address):
    # Combine IP address and MAC address
    combined_str = ip_address + mac_address

    # Convert combined string to integer
    cookie_value = int(combined_str.replace(':', '').replace('.', ''))

    self.delete_flow(bridge_name=DEVICE_BRIDGE,flow=f'cookie={cookie_value}')
    

  def delete_bridge(self, bridge_name):
    LOGGER.debug('Deleting OVS Bridge: ' + bridge_name)
    # Delete the bridge using ovs-vsctl commands
    # Uses the --if-exists option to prevent failures
    # if this bridge does not exists
    success = util.run_command('ovs-vsctl --if-exists del-br ' + bridge_name)
    return success

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
