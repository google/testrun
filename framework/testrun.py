"""The overall control of the Test Run application.

This file provides the integration between all of the
Test Run components, such as net_orc, test_orc and test_ui.

Run using the provided command scripts in the cmd folder.
E.g sudo cmd/start
"""

#!/usr/bin/env python3

import os
import sys
import json
import signal
import time
import logger

# Locate parent directory
current_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(current_dir)

# Add net_orc to Python path
net_orc_dir = os.path.join(parent_dir, 'net_orc', 'python', 'src')
sys.path.append(net_orc_dir)

import network_orchestrator as net_orc

LOGGER = logger.get_logger('test_run')
CONFIG_FILE = "conf/system.json"
EXAMPLE_CONFIG_FILE = "conf/system.json.example"
RUNTIME = 10

class TestRun:
    """Test Run controller.

    Creates an instance of the network orchestrator, test
    orchestrator and user interface.
    """

    def __init__(self):
        LOGGER.info("Starting Test Run")

        # Catch any exit signals
        self._register_exits()

        self._start_network()

        # Keep application running
        time.sleep(RUNTIME)

        self._stop_network()

    def _register_exits(self):
        signal.signal(signal.SIGINT, self._exit_handler)
        signal.signal(signal.SIGTERM, self._exit_handler)
        signal.signal(signal.SIGABRT, self._exit_handler)
        signal.signal(signal.SIGQUIT, self._exit_handler)

    def _exit_handler(self, signum, arg):
        LOGGER.debug("Exit signal received: " + str(signum))
        if signum in (2, signal.SIGTERM):
            LOGGER.info("Exit signal received.")
            self._stop_network()

    def _load_config(self):
        """Loads all settings from the config file into memory."""
        if not os.path.isfile(CONFIG_FILE):
            LOGGER.error("Configuration file is not present at " + CONFIG_FILE)
            LOGGER.info("An example is present in " + EXAMPLE_CONFIG_FILE)
            sys.exit(1)

        with open(CONFIG_FILE, 'r', encoding='UTF-8') as config_file_open:
            config_json = json.load(config_file_open)
            self._net_orc.import_config(config_json)

    def _start_network(self):
        # Create an instance of the network orchestrator
        self._net_orc = net_orc.NetworkOrchestrator()

        # Load config file and pass to other components
        self._load_config()

        # Load and build any unbuilt network containers
        self._net_orc.load_network_modules()
        self._net_orc.build_network_modules()

        # Create baseline network
        self._net_orc.create_net()

        # Launch network service containers
        self._net_orc.start_network_services()

    def _stop_network(self):
        LOGGER.info("Stopping network")
        self._net_orc.stop_networking_services()
        self._net_orc.restore_net()
