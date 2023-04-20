from docker_control import DockerControl
import os
import logger
import json

LOGGER = logger.get_logger('test_orc')
RUNTIME_DIR = "runtime/network"
TEST_MODULES_DIR = "tests/modules"
CONFIG_FILE = "conf/system.json"


class TestOrchestrator:

    def __init__(self):
        self._test_modules = []
        self._module_config = None

        self._path = os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.realpath(__file__))))

        # os.rmdir(os.path.join(self._path, RUNTIME_DIR))
        os.makedirs(os.path.join(self._path, RUNTIME_DIR), exist_ok=True)

        self._docker_cntrl = DockerControl()

    def start_modules(self):
        self._docker_cntrl._start_modules()

    def stop_modules(self,kill=False):
        self._docker_cntrl._stop_modules(kill=kill)

    def build_modules(self):
        # Load and build any unbuilt network containers
        self._docker_cntrl.load_modules()
        self._docker_cntrl._build_modules()

    def import_config(self, json_config):
        modules = json_config['modules']
        for module in modules:
            print(str(module))
