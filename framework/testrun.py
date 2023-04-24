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

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(current_dir)

# Add net_orc to Python path
net_orc_dir = os.path.join(parent_dir, 'net_orc', 'python', 'src')
sys.path.append(net_orc_dir)

#Add test_orc to Python path
test_orc_dir = os.path.join(parent_dir, 'test_orc', 'python', 'src')
sys.path.append(test_orc_dir)

import network_orchestrator as net_orc # pylint: disable=wrong-import-position
import test_orchestrator as test_orc # pylint: disable=wrong-import-position

LOGGER = logger.get_logger('test_run')
CONFIG_FILE = "conf/system.json"
EXAMPLE_CONFIG_FILE = "conf/system.json.example"
RUNTIME = 300

class TestRun: # pylint: disable=too-few-public-methods
    """Test Run controller.

    Creates an instance of the network orchestrator, test
    orchestrator and user interface.
    """

    def __init__(self):

        self._net_orc = net_orc.NetworkOrchestrator()
        self._test_orc = test_orc.TestOrchestrator()

        # Catch any exit signals
        self._register_exits()

    def _register_exits(self):
        signal.signal(signal.SIGINT, self._exit_handler)
        signal.signal(signal.SIGTERM, self._exit_handler)
        signal.signal(signal.SIGABRT, self._exit_handler)
        signal.signal(signal.SIGQUIT, self._exit_handler)

    def _exit_handler(self, signum, arg): # pylint: disable=unused-argument
        LOGGER.debug("Exit signal received: " + str(signum))
        if signum in (2, signal.SIGTERM):
            LOGGER.info("Exit signal received.")
            self.stop_network()

    def load_config(self):
        """Loads all settings from the config file into memory."""
        if not os.path.isfile(CONFIG_FILE):
            LOGGER.error("Configuration file is not present at " + CONFIG_FILE)
            LOGGER.info("An example is present in " + EXAMPLE_CONFIG_FILE)
            sys.exit(1)

        with open(CONFIG_FILE, 'r', encoding='UTF-8') as config_file_open:
            config_json = json.load(config_file_open)
            self._net_orc.import_config(config_json)
            self._test_orc.import_config(config_json)

    def start_network(self):
        """Starts the network orchestrator and network services."""

        # Load and build any unbuilt network containers
        self._net_orc.load_network_modules()
        self._net_orc.build_network_modules()

        self._net_orc.stop_networking_services(kill=True)
        self._net_orc.restore_net()

        # Create baseline network
        self._net_orc.create_net()

        # Launch network service containers
        self._net_orc.start_network_services()

        LOGGER.info("Network is ready.")

    def run_tests(self):
        """Iterate through and start all test modules."""

        self._test_orc.load_test_modules()

        self._test_orc.build_test_modules()

        # Begin testing
        self._test_orc.run_test_modules()

    def stop_network(self):
        """Commands the net_orc to stop the network and clean up."""
        self._net_orc.stop_networking_services(kill=True)
        self._net_orc.restore_net()
        sys.exit(0)
