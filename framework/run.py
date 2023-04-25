"""Starts Test Run."""

import logger
from testrun import TestRun
import argparse
import sys

LOGGER = logger.get_logger('runner')


class TestRunner:

    def __init__(self, local_net=True):

        LOGGER.info('Starting Test Run')

        testrun = TestRun(local_net)

        testrun.load_config()

        testrun.start_network()

        testrun.run_tests()

        testrun.stop_network()


def run(argv):
    parser = argparse.ArgumentParser(description="Test Run",
                                     formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("-r", "--remote-net", action="store_false",
                        help='''Use the network orchestrator from the parent directory instead 
                        		of the one downloaded locally from the install script.''')

    args, unknown = parser.parse_known_args()

    runner = TestRunner(args.remote_net)


if __name__ == "__main__":
    run(sys.argv)
