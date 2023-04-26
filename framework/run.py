"""Starts Test Run."""

import argparse
import sys
from testrun import TestRun
import logger

LOGGER = logger.get_logger('runner')

class TestRunner:

    def __init__(self, local_net=True,config_file=None, argv=None):

        LOGGER.info('Starting Test Run')

        testrun = TestRun(local_net=local_net,argsv=argv)

        testrun.load_config(config_file=config_file)

        testrun.start_network()

        testrun.run_tests()

        testrun.stop_network()


def run(argv):
    parser = argparse.ArgumentParser(description="Test Run",
                                     formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("-r", "--remote-net", action="store_false",
                        help='''Use the network orchestrator from the parent directory instead
                        		of the one downloaded locally from the install script.''')
    parser.add_argument("-f","--config-file", default=None, 
                        help="Define the configuration file for Test Run and Network Orchestrator")

    args, unknown = parser.parse_known_args()

    TestRunner(local_net=args.remote_net,config_file=args.config_file, argv=argv)


if __name__ == "__main__":
    run(sys.argv)
