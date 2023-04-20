from docker_control import DockerControl
import os
import logger
import json
import time
import shutil

LOG_NAME = "test_orc"
LOGGER = None
RUNTIME_DIR = "runtime/testing"
TEST_MODULES_DIR = "tests/modules"
CONFIG_FILE = "conf/system.json"
MODULE_NAME = "test_orchestrator"

class TestOrchestrator:

    def __init__(self):
        self._test_modules = []
        self._module_config = None

        self._path = os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.realpath(__file__))))

        # Resolve the path to the test-run folder
        self._root_path = os.path.abspath(os.path.join(self._path, os.pardir))

        shutil.rmtree(os.path.join(self._root_path, RUNTIME_DIR))
        os.makedirs(os.path.join(self._root_path, RUNTIME_DIR), exist_ok=True)

        self.add_logger(MODULE_NAME)

        self._docker_cntrl = DockerControl(MODULE_NAME)

    def add_logger(self,module):
        global LOGGER
        LOGGER = logger.get_logger(LOG_NAME, module)

    def run_test_modules(self):
        LOGGER.info("Running test modules")
        for module in self._test_modules:
            if module["enabled"]:
                self.run_test_module(module)
        LOGGER.info("All tests complete")

    def run_test_module(self, module_config):
        # Start the test container
        LOGGER.info("Resolving container for test module: " +
                    module_config["name"])
        module = self._docker_cntrl._get_module(module_config["name"])
        if module is not None:
            LOGGER.info("Test module container resolved: " +
                        module.container_name)
            self._docker_cntrl._start_module(module)

        # Wait for the container to exit
        status = self._docker_cntrl._get_module_status(module)
        LOGGER.info("Test module " + module.display_name + " status: " + status)
        if status == "running":
            LOGGER.info("Waiting for test module " + module.display_name + " to complete")
            while status == "running":
                time.sleep(1)
                status = self._docker_cntrl._get_module_status(module)
            LOGGER.info("Test module " + module.display_name + " done")

    def start_modules(self):
        self._docker_cntrl._start_modules()

    def stop_modules(self, kill=False):
        self._docker_cntrl._stop_modules(kill=kill)

    def build_modules(self):
        # Load and build any unbuilt network containers
        self._docker_cntrl.load_modules()
        self._docker_cntrl._build_modules()

    def import_config(self, json_config):
        modules = json_config['modules']
        for module in modules:
            self._test_modules.append(module)
