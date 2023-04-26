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

    def __init__(self, local_net=True, argsv=None):
        self._devices = []

        # Catch any exit signals
        self._register_exits()

        # Import the correct net orchestrator
        self.import_dependencies(local_net)

        self._net_orc = net_orc.NetworkOrchestrator()
        self._test_orc = test_orc.TestOrchestrator()
        self._net_run = net_run.NetworkRunner(argsv)

    def start(self):

        self._load_devices()

        self.start_network()

        # Register callbacks
        # Disable for now as this is causing boot failures when no devices are discovered
        # self._net_orc.listener.register_callback(
        #     self._device_discovered,
        #     [NetworkEvent.DEVICE_DISCOVERED])

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

        global net_run
        import network_runner as net_run  # pylint: disable=wrong-import-position,import-outside-toplevel

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
            self.stop_network()

    def load_config(self, config_file=None):
        if config_file is None:
            # If not defined, use relative pathing to local file
            self._config_file = os.path.join(parent_dir, CONFIG_FILE)
        else:
            # If defined, use as provided
            self._config_file = config_file

        """Loads all settings from the config file into memory."""
        if not os.path.isfile(self._config_file):
            LOGGER.error(
                "Configuration file is not present at " + self._config_file)
            LOGGER.info("An example is present in " + EXAMPLE_CONFIG_FILE)
            sys.exit(1)

        LOGGER.info("Loading Config File: " +
                    os.path.abspath(self._config_file))

        with open(self._config_file, encoding='UTF-8') as config_json_file:
            config_json = json.load(config_json_file)
            self._test_orc.import_config(config_json)

    def start_network(self):
        self._net_run.start(async_monitor=True)

    def run_tests(self):
        """Iterate through and start all test modules."""

        self._test_orc.load_test_modules()
        self._test_orc.build_test_modules()

        # Begin testing
        self._test_orc.run_test_modules()

    def stop_network(self):
        self._net_run._stop()

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
            LOGGER.info(
                f'A new device has been discovered with mac address {device.mac_addr}')
        return device
