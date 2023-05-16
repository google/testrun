#!/usr/bin/env python3

import getpass
import ipaddress
import json
import os
import subprocess
import sys
import time
import threading

import docker
from docker.types import Mount

import logger
import util
from listener import Listener
from network_validator import NetworkValidator

LOGGER = logger.get_logger("net_orc")
CONFIG_FILE = "conf/system.json"
EXAMPLE_CONFIG_FILE = "conf/system.json.example"
RUNTIME_DIR = "runtime/network"
NETWORK_MODULES_DIR = "network/modules"
NETWORK_MODULE_METADATA = "conf/module_config.json"
DEVICE_BRIDGE = "tr-d"
INTERNET_BRIDGE = "tr-c"
PRIVATE_DOCKER_NET = "tr-private-net"
CONTAINER_NAME = "network_orchestrator"
RUNTIME = 1500


class NetworkOrchestrator:
    """Manage and controls a virtual testing network."""

    def __init__(self, config_file=CONFIG_FILE, validate=True, async_monitor=False, single_intf = False):
        self._int_intf = None
        self._dev_intf = None
        self._single_intf = single_intf

        self.listener = None

        self._net_modules = []

        self.validate = validate

        self.async_monitor = async_monitor

        self._path = os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.realpath(__file__))))

        self.validator = NetworkValidator()

        self.network_config = NetworkConfig()

        self.load_config(config_file)

    def start(self):
        """Start the network orchestrator."""

        LOGGER.info("Starting Network Orchestrator")
        # Get all components ready
        self.load_network_modules()

        # Restore the network first if required
        self.stop(kill=True)

        self.start_network()

        if self.async_monitor:
            # Run the monitor method asynchronously to keep this method non-blocking
            self._monitor_thread = threading.Thread(
                target=self.monitor_network)
            self._monitor_thread.daemon = True
            self._monitor_thread.start()
        else:
            self.monitor_network()

    def start_network(self):
        """Start the virtual testing network."""
        LOGGER.info("Starting network")

        self.build_network_modules()
        self.create_net()
        self.start_network_services()

        if self.validate:
            # Start the validator after network is ready
            self.validator.start()

        # Get network ready (via Network orchestrator)
        LOGGER.info("Network is ready.")

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

    def monitor_network(self):
        # TODO: This time should be configurable (How long to hold before exiting, this could be infinite too)
        time.sleep(RUNTIME)

        self.stop()

    def load_config(self,config_file=None):
        if config_file is None:
            # If not defined, use relative pathing to local file
            self._config_file=os.path.join(self._path, CONFIG_FILE)
        else:
            # If defined, use as provided
            self._config_file=config_file

        if not os.path.isfile(self._config_file):
            LOGGER.error("Configuration file is not present at " + config_file)
            LOGGER.info("An example is present in " + EXAMPLE_CONFIG_FILE)
            sys.exit(1)

        LOGGER.info("Loading config file: " + os.path.abspath(self._config_file))    
        with open(self._config_file, encoding='UTF-8') as config_json_file:
            config_json = json.load(config_json_file)
            self.import_config(config_json)

    def import_config(self, json_config):
        self._int_intf = json_config['network']['internet_intf']
        self._dev_intf = json_config['network']['device_intf']

    def _check_network_services(self):
        LOGGER.debug("Checking network modules...")
        for net_module in self._net_modules:
            if net_module.enable_container:
                LOGGER.debug("Checking network module: " +
                            net_module.display_name)
                success = self._ping(net_module)
                if success:
                    LOGGER.debug(net_module.display_name +
                                " responded succesfully: " + str(success))
                else:
                    LOGGER.error(net_module.display_name +
                                    " failed to respond to ping")

    def _ping(self, net_module):
        host = net_module.net_config.ipv4_address
        namespace = "tr-ctns-" + net_module.dir_name
        cmd = "ip netns exec " + namespace + " ping -c 1 " + str(host)
        success = util.run_command(cmd, output=False)
        return success

    def _ci_pre_network_create(self):
        """ Stores network properties to restore network after 
        network creation and flushes internet interface
        """

        self._ethmac = subprocess.check_output(
            f"cat /sys/class/net/{self._int_intf}/address", shell=True).decode("utf-8").strip()
        self._gateway = subprocess.check_output(
            "ip route | head -n 1 | awk '{print $3}'", shell=True).decode("utf-8").strip()
        self._ipv4 = subprocess.check_output(
            f"ip a show {self._int_intf} | grep \"inet \" | awk '{{print $2}}'", shell=True).decode("utf-8").strip()
        self._ipv6 = subprocess.check_output(
            f"ip a show {self._int_intf} | grep inet6 | awk '{{print $2}}'", shell=True).decode("utf-8").strip()
        self._brd = subprocess.check_output(
            f"ip a show {self._int_intf} | grep \"inet \" | awk '{{print $4}}'", shell=True).decode("utf-8").strip()

    def _ci_post_network_create(self):
        """ Restore network connection in CI environment """
        LOGGER.info("post cr")
        util.run_command(f"ip address del {self._ipv4} dev {self._int_intf}")
        util.run_command(f"ip -6 address del {self._ipv6} dev {self._int_intf}")
        util.run_command(f"ip link set dev {self._int_intf} address 00:B0:D0:63:C2:26")
        util.run_command(f"ip addr flush dev {self._int_intf}")
        util.run_command(f"ip addr add dev {self._int_intf} 0.0.0.0")
        util.run_command(f"ip addr add dev {INTERNET_BRIDGE} {self._ipv4} broadcast {self._brd}")
        util.run_command(f"ip -6 addr add {self._ipv6} dev {INTERNET_BRIDGE} ")
        util.run_command(f"systemd-resolve --interface {INTERNET_BRIDGE} --set-dns 8.8.8.8")
        util.run_command(f"ip link set dev {INTERNET_BRIDGE} up")
        util.run_command(f"dhclient {INTERNET_BRIDGE}")
        util.run_command(f"ip route del default via 10.1.0.1")
        util.run_command(f"ip route add default via {self._gateway} src {self._ipv4[:-3]} metric 100 dev {INTERNET_BRIDGE}")

    def _create_private_net(self):
        client = docker.from_env()
        try:
            network = client.networks.get(PRIVATE_DOCKER_NET)
            network.remove()
        except docker.errors.NotFound:
            pass

        # TODO: These should be made into variables
        ipam_pool = docker.types.IPAMPool(
            subnet='100.100.0.0/16',
            iprange='100.100.100.0/24'
        )

        ipam_config = docker.types.IPAMConfig(
            pool_configs=[ipam_pool]
        )

        client.networks.create(
            PRIVATE_DOCKER_NET,
            ipam=ipam_config,
            internal=True,
            check_duplicate=True,
            driver="macvlan"
        )

    def create_net(self):
        LOGGER.info("Creating baseline network")

        if not util.interface_exists(self._int_intf) or not util.interface_exists(self._dev_intf):
            LOGGER.error("Configured interfaces are not ready for use. " +
                         "Ensure both interfaces are connected.")
            sys.exit(1)
        
        if self._single_intf:
            self._ci_pre_network_create()

        # Create data plane
        util.run_command("ovs-vsctl add-br " + DEVICE_BRIDGE)

        # Create control plane
        util.run_command("ovs-vsctl add-br " + INTERNET_BRIDGE)

        # Add external interfaces to data and control plane
        util.run_command("ovs-vsctl add-port " +
                         DEVICE_BRIDGE + " " + self._dev_intf)
        util.run_command("ovs-vsctl add-port " +
                         INTERNET_BRIDGE + " " + self._int_intf)

        # Enable forwarding of eapol packets
        util.run_command("ovs-ofctl add-flow " + DEVICE_BRIDGE +
                         " 'table=0, dl_dst=01:80:c2:00:00:03, actions=flood'")

        # Remove IP from internet adapter
        util.run_command("ifconfig " + self._int_intf + " 0.0.0.0")

        # Set ports up
        util.run_command("ip link set dev " + DEVICE_BRIDGE + " up")
        util.run_command("ip link set dev " + INTERNET_BRIDGE + " up")

        if self._single_intf:
            self._ci_post_network_create()
        
        self._create_private_net()

        self.listener = Listener(self._dev_intf)
        self.listener.start_listener()

    def load_network_modules(self):
        """Load network modules from module_config.json."""
        LOGGER.debug("Loading network modules from /" + NETWORK_MODULES_DIR)

        loaded_modules = "Loaded the following network modules: "
        net_modules_dir = os.path.join(self._path, NETWORK_MODULES_DIR)

        for module_dir in os.listdir(net_modules_dir):

            net_module = NetworkModule()

            # Load basic module information

            net_module_json = json.load(open(os.path.join(
                self._path, net_modules_dir, module_dir, NETWORK_MODULE_METADATA), encoding='UTF-8'))

            net_module.name = net_module_json['config']['meta']['name']
            net_module.display_name = net_module_json['config']['meta']['display_name']
            net_module.description = net_module_json['config']['meta']['description']
            net_module.dir = os.path.join(
                self._path, net_modules_dir, module_dir)
            net_module.dir_name = module_dir
            net_module.build_file = module_dir + ".Dockerfile"
            net_module.container_name = "tr-ct-" + net_module.dir_name
            net_module.image_name = "test-run/" + net_module.dir_name

            # Attach folder mounts to network module
            if "docker" in net_module_json['config']:
                if "mounts" in net_module_json['config']['docker']:
                    for mount_point in net_module_json['config']['docker']['mounts']:
                        net_module.mounts.append(Mount(
                            target=mount_point['target'],
                            source=os.path.join(
                                os.getcwd(), mount_point['source']),
                            type='bind'
                        ))

            # Determine if this is a container or just an image/template
            if "enable_container" in net_module_json['config']['docker']:
                net_module.enable_container = net_module_json['config']['docker']['enable_container']

            # Load network service networking configuration
            if net_module.enable_container:

                net_module.net_config.enable_wan = net_module_json['config']['network']['enable_wan']
                net_module.net_config.ip_index = net_module_json['config']['network']['ip_index']

                net_module.net_config.host = False if not "host" in net_module_json[
                    'config']['network'] else net_module_json['config']['network']['host']

                net_module.net_config.ipv4_address = self.network_config.ipv4_network[
                    net_module.net_config.ip_index]
                net_module.net_config.ipv4_network = self.network_config.ipv4_network

                net_module.net_config.ipv6_address = self.network_config.ipv6_network[
                    net_module.net_config.ip_index]
                net_module.net_config.ipv6_network = self.network_config.ipv6_network

                loaded_modules += net_module.dir_name + " "

                self._net_modules.append(net_module)

        LOGGER.info(loaded_modules)

    def build_network_modules(self):
        LOGGER.info("Building network modules...")
        for net_module in self._net_modules:
            self._build_module(net_module)

    def _build_module(self, net_module):
        LOGGER.debug("Building network module " + net_module.dir_name)
        client = docker.from_env()
        client.images.build(
            dockerfile=os.path.join(net_module.dir, net_module.build_file),
            path=self._path,
            forcerm=True,
            tag="test-run/" + net_module.dir_name
        )

    def _get_network_module(self, name):
        for net_module in self._net_modules:
            if name == net_module.display_name:
                return net_module
        return None

    # Start the OVS network module
    # This should always be called before loading all
    # other modules to allow for a properly setup base
    # network
    def _start_ovs_module(self):
        self._start_network_service(self._get_network_module("OVS"))

    def _start_network_service(self, net_module):

        LOGGER.debug("Starting net service " + net_module.display_name)
        network = "host" if net_module.net_config.host else PRIVATE_DOCKER_NET
        LOGGER.debug(f"""Network: {network}, image name: {net_module.image_name}, 
                     container name: {net_module.container_name}""")
        try:
            client = docker.from_env()
            net_module.container = client.containers.run(
                net_module.image_name,
                auto_remove=True,
                cap_add=["NET_ADMIN"],
                name=net_module.container_name,
                hostname=net_module.container_name,
                network=PRIVATE_DOCKER_NET,
                privileged=True,
                detach=True,
                mounts=net_module.mounts,
                environment={"HOST_USER": getpass.getuser()}
            )
        except docker.errors.ContainerError as error:
            LOGGER.error("Container run error")
            LOGGER.error(error)

        if network != "host":
            self._attach_service_to_network(net_module)

    def _stop_service_module(self, net_module, kill=False):
        LOGGER.debug("Stopping Service container " + net_module.container_name)
        try:
            container = self._get_service_container(net_module)
            if container is not None:
                if kill:
                    LOGGER.debug("Killing container:" +
                                 net_module.container_name)
                    container.kill()
                else:
                    LOGGER.debug("Stopping container:" +
                                 net_module.container_name)
                    container.stop()
                LOGGER.debug("Container stopped:" + net_module.container_name)
        except Exception as error:
            LOGGER.error("Container stop error")
            LOGGER.error(error)

    def _get_service_container(self, net_module):
        LOGGER.debug("Resolving service container: " +
                     net_module.container_name)
        container = None
        try:
            client = docker.from_env()
            container = client.containers.get(net_module.container_name)
        except docker.errors.NotFound:
            LOGGER.debug("Container " +
                         net_module.container_name + " not found")
        except Exception as e:
            LOGGER.error("Failed to resolve container")
            LOGGER.error(e)
        return container

    def stop_networking_services(self, kill=False):
        LOGGER.info("Stopping network services")
        for net_module in self._net_modules:
            # Network modules may just be Docker images, so we do not want to stop them
            if not net_module.enable_container:
                continue
            self._stop_service_module(net_module, kill)

    def start_network_services(self):
        LOGGER.info("Starting network services")

        os.makedirs(os.path.join(os.getcwd(), RUNTIME_DIR), exist_ok=True)

        for net_module in self._net_modules:

            # TODO: There should be a better way of doing this
            # Do not try starting OVS module again, as it should already be running
            if "OVS" != net_module.display_name:

                # Network modules may just be Docker images, so we do not want to start them as containers
                if not net_module.enable_container:
                    continue

                self._start_network_service(net_module)

        LOGGER.info("All network services are running")
        self._check_network_services()

    # TODO: Let's move this into a separate script? It does not look great
    def _attach_service_to_network(self, net_module):
        LOGGER.debug("Attaching net service " +
                     net_module.display_name + " to device bridge")

        # Device bridge interface example: tr-di-dhcp (Test Run Device Interface for DHCP container)
        bridge_intf = DEVICE_BRIDGE + "i-" + net_module.dir_name

        # Container interface example: tr-cti-dhcp (Test Run Container Interface for DHCP container)
        container_intf = "tr-cti-" + net_module.dir_name

        # Container network namespace name
        container_net_ns = "tr-ctns-" + net_module.dir_name

        # Create interface pair
        util.run_command("ip link add " + bridge_intf +
                         " type veth peer name " + container_intf)

        # Add bridge interface to device bridge
        util.run_command("ovs-vsctl add-port " +
                         DEVICE_BRIDGE + " " + bridge_intf)

        # Get PID for running container
        # TODO: Some error checking around missing PIDs might be required
        container_pid = util.run_command(
            "docker inspect -f {{.State.Pid}} " + net_module.container_name)[0]

        # Create symlink for container network namespace
        util.run_command("ln -sf /proc/" + container_pid +
                         "/ns/net /var/run/netns/" + container_net_ns)

        # Attach container interface to container network namespace
        util.run_command("ip link set " + container_intf +
                         " netns " + container_net_ns)

        # Rename container interface name to veth0
        util.run_command("ip netns exec " + container_net_ns +
                         " ip link set dev " + container_intf + " name veth0")

        # Set MAC address of container interface
        util.run_command("ip netns exec " + container_net_ns + " ip link set dev veth0 address 9a:02:57:1e:8f:" + str(net_module.net_config.ip_index))

        # Set IP address of container interface
        util.run_command("ip netns exec " + container_net_ns + " ip addr add " +
                         net_module.net_config.get_ipv4_addr_with_prefix() + " dev veth0")

        util.run_command("ip netns exec " + container_net_ns + " ip addr add " +
                         net_module.net_config.get_ipv6_addr_with_prefix() + " dev veth0")

        # Set interfaces up
        util.run_command("ip link set dev " + bridge_intf + " up")
        util.run_command("ip netns exec " + container_net_ns +
                         " ip link set dev veth0 up")

        if net_module.net_config.enable_wan:
            LOGGER.debug("Attaching net service " +
                         net_module.display_name + " to internet bridge")

            # Internet bridge interface example: tr-ci-dhcp (Test Run Control (Internet) Interface for DHCP container)
            bridge_intf = INTERNET_BRIDGE + "i-" + net_module.dir_name

            # Container interface example: tr-cti-dhcp (Test Run Container Interface for DHCP container)
            container_intf = "tr-cti-" + net_module.dir_name

            # Create interface pair
            util.run_command("ip link add " + bridge_intf +
                             " type veth peer name " + container_intf)

            # Attach bridge interface to internet bridge
            util.run_command("ovs-vsctl add-port " +
                             INTERNET_BRIDGE + " " + bridge_intf)

            # Attach container interface to container network namespace
            util.run_command("ip link set " + container_intf +
                             " netns " + container_net_ns)

            # Rename container interface name to eth1
            util.run_command("ip netns exec " + container_net_ns +
                             " ip link set dev " + container_intf + " name eth1")

            # Set MAC address of container interface
            util.run_command("ip netns exec " + container_net_ns +
                             " ip link set dev eth1 address 9a:02:57:1e:8f:0" + str(net_module.net_config.ip_index))

            # Set interfaces up
            util.run_command("ip link set dev " + bridge_intf + " up")
            util.run_command("ip netns exec " +
                             container_net_ns + " ip link set dev eth1 up")

    def restore_net(self):

        LOGGER.info("Clearing baseline network")

        if hasattr(self, 'listener') and self.listener is not None and self.listener.is_running():
            self.listener.stop_listener()

        client = docker.from_env()

        # Stop all network containers if still running
        for net_module in self._net_modules:
            try:
                container = client.containers.get(
                    "tr-ct-" + net_module.dir_name)
                container.kill()
            except Exception:
                continue

        # Delete data plane
        util.run_command("ovs-vsctl --if-exists del-br tr-d")

        # Delete control plane
        util.run_command("ovs-vsctl --if-exists del-br tr-c")

        # Restart internet interface
        if util.interface_exists(self._int_intf):
            util.run_command("ip link set " + self._int_intf + " down")
            util.run_command("ip link set " + self._int_intf + " up")

        LOGGER.info("Network is restored")


class NetworkModule:

    def __init__(self):
        self.name = None
        self.display_name = None
        self.description = None

        self.container = None
        self.container_name = None
        self.image_name = None

        # Absolute path
        self.dir = None
        self.dir_name = None
        self.build_file = None
        self.mounts = []

        self.enable_container = True

        self.net_config = NetworkModuleNetConfig()

# The networking configuration for a network module


class NetworkModuleNetConfig:

    def __init__(self):

        self.enable_wan = False

        self.ip_index = 0
        self.ipv4_address = None
        self.ipv4_network = None
        self.ipv6_address = None
        self.ipv6_network = None

        self.host = False

    def get_ipv4_addr_with_prefix(self):
        return format(self.ipv4_address) + "/" + str(self.ipv4_network.prefixlen)

    def get_ipv6_addr_with_prefix(self):
        return format(self.ipv6_address) + "/" + str(self.ipv6_network.prefixlen)

# Represents the current configuration of the network for the device bridge

class NetworkConfig:

    # TODO: Let's get this from a configuration file
    def __init__(self):
        self.ipv4_network = ipaddress.ip_network('10.10.10.0/24')
        self.ipv6_network = ipaddress.ip_network('fd10:77be:4186::/64')
