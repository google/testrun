#!/usr/bin/env python3

"""Wrapper for the NetworkOrchestrator that simplifies
virtual network start process by allowing direct calling
from the command line.

Run using the provided command scripts in the cmd folder.
E.g sudo cmd/start
"""

import argparse
import signal
import sys
import time

import logger

from network_orchestrator import NetworkOrchestrator

LOGGER = logger.get_logger('net_runner')

class NetworkRunner:
    def __init__(self, config_file=None, validate=True, async_monitor=False):
        self._monitor_thread = None
        self._register_exits()
        self.net_orc = NetworkOrchestrator(config_file=config_file,validate=validate,async_monitor=async_monitor)

    def _register_exits(self):
        signal.signal(signal.SIGINT, self._exit_handler)
        signal.signal(signal.SIGTERM, self._exit_handler)
        signal.signal(signal.SIGABRT, self._exit_handler)
        signal.signal(signal.SIGQUIT, self._exit_handler)

    def _exit_handler(self, signum, arg):  # pylint: disable=unused-argument
        LOGGER.debug("Exit signal received: " + str(signum))
        if signum in (2, signal.SIGTERM):
            LOGGER.info("Exit signal received.")
            # Kill all container services quickly
            # If we're here, we want everything to stop immediately
            # and don't care about a gracefully shutdown
            self.stop(True)
            sys.exit(1)

    def stop(self, kill=False):
        self.net_orc.stop(kill)

    def start(self):
        self.net_orc.start()

def parse_args(argv):
    parser = argparse.ArgumentParser(description="Test Run Help",
                                     formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("--no-validate", action="store_true",
                        help="Turn off the validation of the network after network boot")
    parser.add_argument("-f", "--config-file", default=None,
                        help="Define the configuration file for the Network Orchestrator")
    parser.add_argument("-d", "--daemon", action="store_true",
                        help="Run the network monitor process in the background as a daemon thread")

    args, unknown = parser.parse_known_args()
    return args

if __name__ == "__main__":
    args=parse_args(sys.argv)
    runner = NetworkRunner(config_file=args.config_file,
               validate=not args.no_validate,
               async_monitor=args.daemon)
    runner.start()