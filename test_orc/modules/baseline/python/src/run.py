#!/usr/bin/env python3

import argparse
import signal
import sys
import logger

from baseline_module import BaselineModule

LOGGER = logger.get_logger('test_module')
RUNTIME = 1500

class BaselineModuleRunner:

    def __init__(self,module):

        signal.signal(signal.SIGINT, self._handler)
        signal.signal(signal.SIGTERM, self._handler)
        signal.signal(signal.SIGABRT, self._handler)
        signal.signal(signal.SIGQUIT, self._handler)

        LOGGER.info("Starting Baseline Module")

        self._test_module = BaselineModule(module)
        self._test_module.run_tests()

    def _handler(self, signum, *other):
        LOGGER.debug("SigtermEnum: " + str(signal.SIGTERM))
        LOGGER.debug("Exit signal received: " + str(signum))
        if signum in (2, signal.SIGTERM):
            LOGGER.info("Exit signal received. Stopping test module...")
            LOGGER.info("Test module stopped")
            sys.exit(1)

def run(argv):
    parser = argparse.ArgumentParser(description="Baseline Module Help",
                                 formatter_class=argparse.ArgumentDefaultsHelpFormatter)

    parser.add_argument(
        "-m", "--module", help="Define the module name to be used to create the log file")

    args = parser.parse_args()

    # For some reason passing in the args from bash adds an extra
    # space before the argument so we'll just strip out extra space 
    BaselineModuleRunner(args.module.strip())

if __name__ == "__main__":
    run(sys.argv)
