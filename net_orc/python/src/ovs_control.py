"""OVS Control Module"""
import json
import logger
import util
import os

CONFIG_FILE = 'conf/system.json'
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
    LOGGER.debug('Adding OVS Bridge: ' + bridge_name)
    # Create the bridge using ovs-vsctl commands
    # Uses the --may-exist option to prevent failures
    # if this bridge already exists by this name it won't fail
    # and will not modify the existing bridge
    success = util.run_command('ovs-vsctl --may-exist add-br ' + bridge_name)
    return success

  def add_flow(self, bridge_name, flow):
    # Add a flow to the bridge using ovs-ofctl commands
    LOGGER.debug(f'Adding Flow {flow} to Bridge: {bridge_name}')
    success = util.run_command(f'ovs-ofctl add-flow {bridge_name} \'{flow}\'')
    return success

  def add_port(self, port, bridge_name):
    LOGGER.debug('Adding Port ' + port + ' to OVS Bridge: ' + bridge_name)
    # Add a port to the bridge using ovs-vsctl commands
    # Uses the --may-exist option to prevent failures
    # if this port already exists on the bridge and will not
    # modify the existing bridge
    success = util.run_command(f"""ovs-vsctl --may-exist
                             add-port {bridge_name} {port}""")
    return success

  def create_net(self):
    LOGGER.debug('Creating baseline network')

    # Remove IP from internet adapter
    self.set_interface_ip(interface=self._int_intf,ip_addr='0.0.0.0')

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

  def delete_bridge(self, bridge_name):
    LOGGER.debug('Deleting OVS Bridge: ' + bridge_name)
    # Delete the bridge using ovs-vsctl commands
    # Uses the --if-exists option to prevent failures
    # if this bridge does not exists
    success = util.run_command('ovs-vsctl --if-exists del-br ' + bridge_name)
    return success

  def _load_config(self):
    path = os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.realpath(__file__)))))
    config_file = os.path.join(path, CONFIG_FILE)
    LOGGER.debug('Loading Configuration: ' + config_file)
    with open(config_file, 'r', encoding='utf-8') as conf_file:
      config_json = json.load(conf_file)
    self._int_intf = config_json['network']['internet_intf']
    self._dev_intf = config_json['network']['device_intf']
    LOGGER.debug('Configuration Loaded')
    LOGGER.debug('Internet Interface: ' + self._int_intf)
    LOGGER.debug('Device Interface: ' + self._dev_intf)

  def restore_net(self):
    LOGGER.debug('Restoring Network...')
    # Delete data plane
    self.delete_bridge(DEVICE_BRIDGE)

    # Delete control plane
    self.delete_bridge(INTERNET_BRIDGE)

    LOGGER.debug('Network is restored')

  def show_config(self):
    LOGGER.debug('Show current config of OVS')
    success = util.run_command('ovs-vsctl show')
    return success

  def set_bridge_up(self, bridge_name):
    LOGGER.debug('Setting Bridge device to up state: ' + bridge_name)
    success = util.run_command('ip link set dev ' + bridge_name + ' up')
    return success

  def set_interface_ip(self, interface, ip_addr):
    LOGGER.debug('Setting interface ' + interface + ' to ' + ip_addr)
    # Remove IP from internet adapter
    util.run_command(f'ifconfig {interface} {ip_addr}')
