#!/usr/bin/env python3

import signal
import time
import sys
import argparse
import logger

LOGGER = None
LOG_NAME = "test_module_template"


class TestModule:

    def __init__(self, module):

        self.module_test1 = None
        self.module_test2 = None
        self.module_test3 = None
        self.add_logger(module)

        signal.signal(signal.SIGINT, self.handler)
        signal.signal(signal.SIGTERM, self.handler)
        signal.signal(signal.SIGABRT, self.handler)
        signal.signal(signal.SIGQUIT, self.handler)

    def add_logger(self, module):
        global LOGGER
        LOGGER = logger.get_logger(LOG_NAME, module)

    # Make up some fake test results
    def run_tests(self):
        LOGGER.info("Running test 1...")
        self.module_test1 = True
        LOGGER.info("Test 1 complete.")

        LOGGER.info("Running test 2...")
        self.module_test2 = False
        LOGGER.info("Test 2 complete.")

    def generate_results(self):
        self.print_test_result("Test 1", self.module_test1)
        self.print_test_result("Test 2", self.module_test2)
        self.print_test_result("Test 3", self.module_test3)

    def print_test_result(self, test_name, result):
        if result is not None:
            LOGGER.info(
                test_name + ": Pass" if result else test_name + ": Fail")
        else:
            LOGGER.info(test_name + " Skipped")

    def handler(self, signum, frame):
        if (signum == 2 or signal == signal.SIGTERM):
            exit(1)
