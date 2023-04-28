#!/usr/bin/env python3

import os
import logger
import signal
import time
import os 

from network_orchestrator import NetworkOrchestrator
from network_orchestrator_validator import NetworkOrchestratorValidator

LOGGER = logger.get_logger('test_run')
RUNTIME_FOLDER = "runtime/network"

class ValidatorRun:

    def __init__(self):

        signal.signal(signal.SIGINT, self.handler)
        signal.signal(signal.SIGTERM, self.handler)
        signal.signal(signal.SIGABRT, self.handler)
        signal.signal(signal.SIGQUIT, self.handler)

        LOGGER.info("Starting Network Orchestrator")
        #os.makedirs(RUNTIME_FOLDER)

        # Cleanup any old validator components
        self._validator = NetworkOrchestratorValidator()
        self._validator._stop_validator(True);

        # Start the validator after network is ready
        self._validator._start_validator()

        # TODO: Kill validator once all faux devices are no longer running
        time.sleep(2000)

        # Gracefully shutdown network
        self._validator._stop_validator();

    def handler(self, signum, frame):
        LOGGER.debug("SigtermEnum: " + str(signal.SIGTERM))
        LOGGER.debug("Exit signal received: " + str(signum))
        if (signum == 2 or signum == signal.SIGTERM):
            LOGGER.info("Exit signal received. Stopping validator...")
            # Kill all container services quickly
            # If we're here, we want everything to stop immediately
            # and don't care about a gracefully shutdown.
            self._validator._stop_validator(True);
            LOGGER.info("Validator stopped")
            exit(1)

test_run = ValidatorRun()
