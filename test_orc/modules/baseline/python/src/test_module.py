#!/usr/bin/env python3

import time
import logger

LOG_NAME = "test_baseline"
LOGGER = logger.get_logger(LOG_NAME)



class TestModule:

    def __init__(self):

        self.module_test1 = None
        self.module_test2 = None
        self.module_test3 = None

    # Make up some fake test results
    def run_tests(self):
        LOGGER.info("Running test 1...")
        self.module_test1 = True
        LOGGER.info("Test 1 complete.")

        LOGGER.info("Running test 2...")
        self.module_test2 = False
        LOGGER.info("Test 2 complete.")

        time.sleep(10)

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
