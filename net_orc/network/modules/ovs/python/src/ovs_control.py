#!/usr/bin/env python3

#import ipaddress
import json
import logger
#import os
import util

CONFIG_FILE = "/ovs/conf/system.json"
DEVICE_BRIDGE = "tr-d"
INTERNET_BRIDGE = "tr-c"
LOGGER = logger.get_logger('ovs_ctrl')

class OVSControl:

	def __init__(self):
		self._int_intf = None
		self._dev_intf = None
		self._load_config()

	def add_bridge(self,bridgeName):
		LOGGER.info("Adding OVS Bridge: " + bridgeName)
		# Create the bridge using ovs-vsctl commands
		# Uses the --may-exist option to prevent failures
		# if this bridge already exists by this name it won't fail
		# and will not modify the existing bridge
		success=util.run_command("ovs-vsctl --may-exist add-br " + bridgeName)
		return success

	def add_port(self,port, bridgeName):
		LOGGER.info("Adding Port " + port + " to OVS Bridge: " + bridgeName)
		# Add a port to the bridge using ovs-vsctl commands
		# Uses the --may-exist option to prevent failures
		# if this port already exists on the bridge and will not 
		# modify the existing bridge
		success=util.run_command("ovs-vsctl --may-exist add-port " + bridgeName + " " + port)
		return success

	def create_net(self):
		LOGGER.info("Creating baseline network")

		# Create data plane
		self.add_bridge(DEVICE_BRIDGE)

		# Create control plane
		self.add_bridge(INTERNET_BRIDGE)

		# Remove IP from internet adapter
		self.set_interface_ip(self._int_intf,"0.0.0.0")

		# Add external interfaces to data and control plane
		self.add_port(self._dev_intf,DEVICE_BRIDGE)
		self.add_port(self._int_intf,INTERNET_BRIDGE)

		# # Set ports up
		self.set_bridge_up(DEVICE_BRIDGE)
		self.set_bridge_up(INTERNET_BRIDGE)		

	def delete_bridge(self,bridgeName):
		LOGGER.info("Deleting OVS Bridge: " + bridgeName)
		# Delete the bridge using ovs-vsctl commands
		# Uses the --if-exists option to prevent failures
		# if this bridge does not exists
		success=util.run_command("ovs-vsctl --if-exists del-br " + bridgeName)
		return success

	def _load_config(self):
		LOGGER.info("Loading Configuration: " + CONFIG_FILE)
		config_json = json.load(open(CONFIG_FILE, 'r'))
		self._int_intf = config_json['internet_intf']
		self._dev_intf = config_json['device_intf']
		LOGGER.info("Configuration Loaded")
		LOGGER.info("Internet Interface: " + self._int_intf)
		LOGGER.info("Device Interface: " + self._dev_intf)

	def restore_net(self):
		LOGGER.info("Restoring Network...")
		# Delete data plane
		self.delete_bridge(DEVICE_BRIDGE)

		# Delete control plane
		self.delete_bridge(INTERNET_BRIDGE)

		LOGGER.info("Network is restored")

	def show_config(self):
		LOGGER.info("Show current config of OVS")
		success=util.run_command("ovs-vsctl show")
		return success

	def set_bridge_up(self,bridgeName):
		LOGGER.info("Setting Bridge device to up state: " + bridgeName)
		success=util.run_command("ip link set dev " + bridgeName + " up")
		return success

	def set_interface_ip(self,interface, ipAddr):
		LOGGER.info("Setting interface " + interface + " to " + ipAddr)
		# Remove IP from internet adapter
		util.run_command("ifconfig " + interface + " 0.0.0.0")

if __name__ == '__main__':
	ovs = OVSControl()
	ovs.create_net()
	ovs.show_config()
	ovs.restore_net()
	ovs.show_config()

