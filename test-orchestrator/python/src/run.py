#!/usr/bin/env python3

import argparse
import signal
import sys
import time
import logger

from test_orchestrator import TestOrchestrator

LOGGER = logger.get_logger('net_orc')
RUNTIME = 300


class TestRunner:

    def __init__(self, args):

        signal.signal(signal.SIGINT, self._handler)
        signal.signal(signal.SIGTERM, self._handler)
        signal.signal(signal.SIGABRT, self._handler)
        signal.signal(signal.SIGQUIT, self._handler)

        LOGGER.info("Starting Test Orchestrator")

        # Get all components ready
        self._test_orc = TestOrchestrator()
        self._test_orc.load_config()
        # self._net_orc.load_network_modules()

        # # Restore the network first if required
        # self._net_orc.stop_networking_services()
        # self._net_orc.restore_net()

        # self._net_orc.build_network_modules()
        # self._net_orc.create_net()
        # self._net_orc.start_network_services()

        # Get network ready (via Network orchestrator)
        LOGGER.info("Test orchestrator is ready.")

        # TODO: This time should be configurable (How long to hold before exiting, this could be infinite too)
        time.sleep(RUNTIME)

        # self._validator._stop_validator()
        # # Gracefully shutdown network
        # self._net_orc.stop_networking_services(kill=False)
        # self._net_orc.restore_net()

    def _handler(self, signum, *other):
        LOGGER.debug("SigtermEnum: " + str(signal.SIGTERM))
        LOGGER.debug("Exit signal received: " + str(signum))
        if signum in (2, signal.SIGTERM):
            LOGGER.info("Exit signal received. Stopping tests...")
            # Kill all container services quickly
            # If we're here, we want everything to stop immediately
            # and don't care about a gracefully shutdown.
            self._validator._stop_validator(True)
            self._net_orc.stop_networking_services(True)
            self._net_orc.restore_net()
            LOGGER.info("Tests stopped")
            sys.exit(1)


def run(argv):
    parser = argparse.ArgumentParser(description="Test Run Help",
                                     formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("--validate", action="store_true",
                        help="Run the validation of the network after network boot")

    args = parser.parse_args()

    TestRunner(args)


if __name__ == "__main__":
    run(sys.argv)
