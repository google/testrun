import json
import logger
import os

LOGGER = None
RESULTS_DIR = "/runtime/output/"
CONF_DIR = "/testrun/conf"

class TestModule:

    def __init__(self,module_name, log_name):
        self._module_name=module_name
        self._device_mac = os.environ['DEVICE_MAC']
        self._add_logger(log_name=log_name,module_name=module_name)

    def _add_logger(self, log_name, module_name):
        global LOGGER
        LOGGER = logger.get_logger(log_name, module_name)

    def _get_logger(self):
        return LOGGER

    def run_tests(self):
        tests = []
        tests.append({"name": "dns.network.from_device",
                      "description": "", "expected_behavior": ""})
        tests.append({"name": "dns.network.from_dhcp",
                      "description": "", "expected_behavior": ""})
        for test in tests:
            test_method_name = "_" + test["name"].replace(".", "_")
            LOGGER.info("Attempting to run test: " + test_method_name)

            # Resolve the correct python method by test name and run test
            if hasattr(self, test_method_name):
                result = getattr(self, test_method_name)()
            else:
                LOGGER.info("Test method " + test_method_name +
                            " not resolved. Skipping")
                result = None

            if result is not None:
                test["result"] = "compliant" if result else "non-compliant"
            else:
                test["result"] = "skipped"
            LOGGER.info(test["name"] + ": " + str(result))
        json_results = json.dumps({"results": tests}, indent=2)
        self._write_results(json_results)

    def _write_results(self, results):
        results_file = RESULTS_DIR + self._module_name + "-result.json"
        LOGGER.info("Writing results to " + results_file)
        f = open(results_file, "w", encoding="utf-8")
        f.write(results)
        f.close()
