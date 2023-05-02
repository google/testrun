#!/usr/bin/env python3

import signal
import sys
import argparse

from grpc.dhcp_config import DHCPConfig


class DHCPServer:

    def __init__(self, module):

        signal.signal(signal.SIGINT, self.handler)
        signal.signal(signal.SIGTERM, self.handler)
        signal.signal(signal.SIGABRT, self.handler)
        signal.signal(signal.SIGQUIT, self.handler)

        config = DHCPConfig()
        config.resolve_config()
        config.write_config()

    def handler(self, signum, frame):
        if (signum == 2 or signal == signal.SIGTERM):
            exit(1)


def run(argv):
    parser = argparse.ArgumentParser(description="Faux Device Validator",
                                     formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument(
        "-m", "--module", help="Define the module name to be used to create the log file")

    args = parser.parse_args()

    server = DHCPServer(args.module)


if __name__ == "__main__":
    run(sys.argv)
