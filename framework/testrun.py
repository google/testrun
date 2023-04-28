"""The overall control of the Test Run application.

This file provides the integration between all of the
Test Run components, such as net_orc, test_orc and test_ui.

Run using the provided command scripts in the cmd folder.
E.g sudo cmd/start
"""

import os
import sys
import json
import signal
import time
import logger
from device import Device

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(current_dir)

LOGGER = logger.get_logger('test_run')
CONFIG_FILE = "conf/system.json"
EXAMPLE_CONFIG_FILE = "conf/system.json.example"
RUNTIME = 300

DEVICES_DIR = 'local/devices'
DEVICE_CONFIG = 'device_config.json'
DEVICE_MAKE = 'make'
DEVICE_MODEL = 'model'
DEVICE_MAC_ADDR = 'mac_addr'


class TestRun:  # pylint: disable=too-few-public-methods
    """Test Run controller.

    Creates an instance of the network orchestrator, test
    orchestrator and user interface.
    """

    def __init__(self, local_net=True, config_file=CONFIG_FILE,validate=True, net_only=False):
        self._devices = []
        self._net_only = net_only

        # Catch any exit signals
        self._register_exits()

        # Import the correct net orchestrator
        self.import_dependencies(local_net)

        # Expand the config file to absolute pathing
        config_file_abs=self._get_config_abs(config_file=config_file)
        
        self._net_orc = net_orc.NetworkOrchestrator(config_file=config_file_abs,validate=validate,async_monitor=not self._net_only)
        self._test_orc = test_orc.TestOrchestrator()
 
    def start(self):

        self._load_devices()

        self._start_network()

        if self._net_only:
            LOGGER.info("Network only option configured, no tests will be run")
            time.sleep(RUNTIME)
        else:
            self._net_orc.listener.register_callback(
             self._device_discovered,
             [NetworkEvent.DEVICE_DISCOVERED])
        
            LOGGER.info("Waiting for devices on the network...")

        # Check timeout and whether testing is currently in progress before stopping
        time.sleep(RUNTIME)
        self.stop()

    def stop(self,kill=False):
        self._stop_tests()
        self._stop_network(kill=kill)

    def import_dependencies(self, local_net=True):
        if local_net:
            # Add local net_orc to Python path
            net_orc_dir = os.path.join(parent_dir, 'net_orc', 'python', 'src')
        else:
            # Resolve the path to the test-run parent folder
            root_dir = os.path.abspath(os.path.join(parent_dir, os.pardir))
            # Add manually cloned network orchestrator from parent folder
            net_orc_dir = os.path.join(
                root_dir, 'network-orchestrator', 'python', 'src')
        # Add net_orc to Python path
        sys.path.append(net_orc_dir)
        # Import the network orchestrator
        global net_orc
        import network_orchestrator as net_orc  # pylint: disable=wrong-import-position,import-outside-toplevel

        # Add test_orc to Python path
        test_orc_dir = os.path.join(parent_dir, 'test_orc', 'python', 'src')
        sys.path.append(test_orc_dir)
        global test_orc
        import test_orchestrator as test_orc  # pylint: disable=wrong-import-position,import-outside-toplevel

        global NetworkEvent
        from listener import NetworkEvent  # pylint: disable=wrong-import-position,import-outside-toplevel

    def _register_exits(self):
        signal.signal(signal.SIGINT, self._exit_handler)
        signal.signal(signal.SIGTERM, self._exit_handler)
        signal.signal(signal.SIGABRT, self._exit_handler)
        signal.signal(signal.SIGQUIT, self._exit_handler)

    def _exit_handler(self, signum, arg):  # pylint: disable=unused-argument
        LOGGER.debug("Exit signal received: " + str(signum))
        if signum in (2, signal.SIGTERM):
            LOGGER.info("Exit signal received.")
            self.stop(kill=True)
            sys.exit(1)

    def _get_config_abs(self,config_file=None):
        if config_file is None:
            # If not defined, use relative pathing to local file
            config_file = os.path.join(parent_dir, CONFIG_FILE)

        # Expand the config file to absolute pathing 
        return os.path.abspath(config_file)

    def _start_network(self):
        self._net_orc.start()

    def _run_tests(self):
        """Iterate through and start all test modules."""
        self._test_orc.start()

    def _stop_network(self,kill=False):
        self._net_orc.stop(kill=kill)

    def _stop_tests(self):
        self._test_orc.stop()

    def _load_devices(self):
        LOGGER.debug('Loading devices from ' + DEVICES_DIR)

        for device_folder in os.listdir(DEVICES_DIR):
            with open(os.path.join(DEVICES_DIR, device_folder, DEVICE_CONFIG),
                      encoding='utf-8') as device_config_file:
                device_config_json = json.load(device_config_file)

                device_make = device_config_json.get(DEVICE_MAKE)
                device_model = device_config_json.get(DEVICE_MODEL)
                mac_addr = device_config_json.get(DEVICE_MAC_ADDR)

                device = Device(device_make, device_model,
                                mac_addr=mac_addr)
                self._devices.append(device)

        LOGGER.info('Loaded ' + str(len(self._devices)) + ' devices')

    def get_device(self, mac_addr):
        """Returns a loaded device object from the device mac address."""
        for device in self._devices:
            if device.mac_addr == mac_addr:
                return device
        return None

    def _device_discovered(self, mac_addr):
        device = self.get_device(mac_addr)
        if device is not None:
            LOGGER.info(
                f'Discovered {device.make} {device.model} on the network')
        else:
            device = Device(make=None, model=None, mac_addr=mac_addr)
            LOGGER.info(
                f'A new device has been discovered with mac address {mac_addr}')
        
        # TODO: Pass device information to test orchestrator/runner
        self._run_tests()
