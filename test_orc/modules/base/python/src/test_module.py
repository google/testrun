import json
import logger
import os

LOGGER = None
RESULTS_DIR = "/runtime/output/"
CONF_FILE = "/testrun/conf/module_config.json"


class TestModule:

    def __init__(self, module_name, log_name):
        self._module_name = module_name
        self._device_mac = os.environ['DEVICE_MAC']
        self._add_logger(log_name=log_name, module_name=module_name)
        self._config = self._read_config()

    def _add_logger(self, log_name, module_name):
        global LOGGER
        LOGGER = logger.get_logger(log_name, module_name)

    def _get_logger(self):
        return LOGGER

    def _get_tests(self):
        device_test_module = self._get_device_test_module()
        return self._get_device_tests(device_test_module)

    def _get_device_tests(self, device_test_module):
        module_tests = self._config["config"]["tests"]
        if device_test_module is None:
            return module_tests
        elif not device_test_module["enabled"]:
            return []
        else:
            for test in module_tests:
                for dev_test in device_test_module["tests"]:
                    if test["name"] == dev_test["name"]:
                        test["enabled"] = dev_test["enabled"]
            return module_tests

    def _get_device_test_module(self):
        device_modules = json.loads(os.environ['DEVICE_TEST_MODULES'])
        for module in device_modules:
            if self._module_name == module["name"]:
                return module
        return None

    def run_tests(self):
        tests = self._get_tests()
        device_modules = os.environ['DEVICE_TEST_MODULES']
        for test in tests:
            test_method_name = "_" + test["name"].replace(".", "_") 
            result = None
            if ("enabled" in test and test["enabled"]) or "enabled" not in test:
                LOGGER.info("Attempting to run test: " + test["name"])  

                # Resolve the correct python method by test name and run test
                if hasattr(self, test_method_name):
                    result = getattr(self, test_method_name)()
                else:
                    LOGGER.info("Test " + test["name"] +
                                " not resolved. Skipping")
                    result = None
            else:
                LOGGER.info("Test " + test["name"] +
                                " disabled. Skipping")
            if result is not None:
                test["result"] = "compliant" if result else "non-compliant"
            else:
                test["result"] = "skipped"
            LOGGER.info(test["name"] + ": " + str(result))
        json_results = json.dumps({"results": tests}, indent=2)
        self._write_results(json_results)

    def _read_config(self):
        f = open(CONF_FILE, encoding="utf-8")
        config = json.load(f)
        f.close()
        return config

    def _write_results(self, results):
        results_file = RESULTS_DIR + self._module_name + "-result.json"
        LOGGER.info("Writing results to " + results_file)
        f = open(results_file, "w", encoding="utf-8")
        f.write(results)
        f.close()
