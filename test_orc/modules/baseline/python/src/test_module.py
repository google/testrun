#!/usr/bin/env python3

import json
import time
import logger

LOG_NAME = "test_baseline"
RESULTS_DIR = "/runtime/output/"
LOGGER = logger.get_logger(LOG_NAME)

class TestModule:

    def __init__(self, module):

        self.module_test1 = None
        self.module_test2 = None
        self.module_test3 = None
        self.module = module
        self.add_logger(module)

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
        results = []
        results.append(self.generate_result("Test 1", self.module_test1))
        results.append(self.generate_result("Test 2", self.module_test2))
        results.append(self.generate_result("Test 3", self.module_test3))
        json_results = json.dumps({"results":results}, indent=2)
        self.write_results(json_results)

    def write_results(self,results):
        results_file=RESULTS_DIR+self.module+"-result.json"
        LOGGER.info("Writing results to " + results_file)
        f = open(results_file, "w", encoding="utf-8")
        f.write(results)
        f.close()

    def generate_result(self, test_name, test_result):
        if test_result is not None:
            result = "compliant" if test_result else "non-compliant"
        else:
            result = "skipped"
        LOGGER.info(test_name + ": " + result)
        res_dict = {
            "name": test_name,
            "result": result,
            "description": "The device is " + result
        }
        return res_dict
