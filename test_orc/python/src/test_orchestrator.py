"""Provides high level management of the test orchestrator."""
import os
import json
import time
import shutil
import docker
from docker.types import Mount
import logger
from module import TestModule

LOG_NAME = "test_orc"
LOGGER = logger.get_logger("test_orc")
RUNTIME_DIR = "runtime"
TEST_MODULES_DIR = "modules"
MODULE_CONFIG = "conf/module_config.json"

class TestOrchestrator:
    """Manages and controls the test modules."""

    def __init__(self):
        self._test_modules = []
        self._module_config = None

        self._path = os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.realpath(__file__))))

        # Resolve the path to the test-run folder
        self._root_path = os.path.abspath(os.path.join(self._path, os.pardir))

        shutil.rmtree(os.path.join(self._root_path, RUNTIME_DIR), ignore_errors=True)
        os.makedirs(os.path.join(self._root_path, RUNTIME_DIR), exist_ok=True)

    def start(self):
        LOGGER.info("Starting Test Orchestrator")
        self._load_test_modules()
        self._run_test_modules()

    def stop(self):
        """Stop any running tests"""
        self._stop_modules()

    def _run_test_modules(self):
        """Iterates through each test module and starts the container."""
        LOGGER.info("Running test modules...")
        for module in self._test_modules:
            self._run_test_module(module)
        LOGGER.info("All tests complete")

    def _run_test_module(self, module):
        """Start the test container and extract the results."""

        if module is None or not module.enable_container:
            return

        LOGGER.info("Running test module " + module.name)
        try:

            container_runtime_dir = os.path.join(self._root_path, "runtime/test/" + module.name)
            os.makedirs(container_runtime_dir)

            client = docker.from_env()

            module.container = client.containers.run(
                module.image_name,
                auto_remove=True,
                cap_add=["NET_ADMIN"],
                name=module.container_name,
                hostname=module.container_name,
                privileged=True,
                detach=True,
                mounts=[Mount(
                            target="/runtime/output",
                            source=container_runtime_dir,
                            type='bind'
                        )],
                environment={"HOST_USER": os.getlogin()}
            )
        except (docker.errors.APIError, docker.errors.ContainerError) as container_error:
            LOGGER.error("Test module " + module.name + " has failed to start")
            LOGGER.debug(container_error)
            return

        # Determine the module timeout time
        test_module_timeout = time.time() + module.timeout
        status = self._get_module_status(module)

        while time.time() < test_module_timeout and status == 'running':
            time.sleep(1)
            status = self._get_module_status(module)

        LOGGER.info("Test module " + module.name + " has finished")

    def _get_module_status(self,module):
        container = self._get_module_container(module)
        if container is not None:
            return container.status
        return None

    def _get_module_container(self, module):
        container = None
        try:
            client = docker.from_env()
            container = client.containers.get(module.container_name)
        except docker.errors.NotFound:
            LOGGER.debug("Container " +
                         module.container_name + " not found")
        except docker.errors.APIError as error:
            LOGGER.error("Failed to resolve container")
            LOGGER.error(error)
        return container

    def _load_test_modules(self):
        """Import module configuration from module_config.json."""

        modules_dir = os.path.join(self._path, TEST_MODULES_DIR)

        LOGGER.debug("Loading test modules from /" + modules_dir)
        loaded_modules = "Loaded the following test modules: "

        for module_dir in os.listdir(modules_dir):

            LOGGER.debug("Loading module from: " + module_dir)

            # Load basic module information
            module = TestModule()
            with open(os.path.join(
                self._path,
                modules_dir,
                module_dir,
                MODULE_CONFIG),
                encoding='UTF-8') as module_config_file:
                module_json = json.load(module_config_file)

            module.name = module_json['config']['meta']['name']
            module.display_name = module_json['config']['meta']['display_name']
            module.description = module_json['config']['meta']['description']
            module.dir = os.path.join(self._path, modules_dir, module_dir)
            module.dir_name = module_dir
            module.build_file = module_dir + ".Dockerfile"
            module.container_name = "tr-ct-" + module.dir_name + "-test"
            module.image_name = "test-run/" + module.dir_name + "-test"

            if 'timeout' in module_json['config']['docker']:
                module.timeout = module_json['config']['docker']['timeout']

            # Determine if this is a container or just an image/template
            if "enable_container" in module_json['config']['docker']:
                module.enable_container = module_json['config']['docker']['enable_container']

            self._test_modules.append(module)

            if module.enable_container:
              loaded_modules += module.dir_name + " "

        LOGGER.info(loaded_modules)

    def build_test_modules(self):
        """Build all test modules."""
        LOGGER.info("Building test modules...")
        for module in self._test_modules:
            self._build_test_module(module)

    def _build_test_module(self, module):
        LOGGER.debug("Building docker image for module " + module.dir_name)
        client = docker.from_env()
        try:
            client.images.build(
                dockerfile=os.path.join(module.dir, module.build_file),
                path=self._path,
                forcerm=True, # Cleans up intermediate containers during build
                tag=module.image_name
            )
        except docker.errors.BuildError as error:
            LOGGER.error(error)

    def _stop_modules(self, kill=False):
        LOGGER.info("Stopping test modules")
        for module in self._test_modules:
            # Test modules may just be Docker images, so we do not want to stop them
            if not module.enable_container:
                continue
            self._stop_module(module, kill)
        LOGGER.info("All test modules have been stopped")

    def _stop_module(self, module, kill=False):
        LOGGER.debug("Stopping test module " + module.container_name)
        try:
            container = module.container
            if container is not None:
                if kill:
                    LOGGER.debug("Killing container:" +
                                 module.container_name)
                    container.kill()
                else:
                    LOGGER.debug("Stopping container:" +
                                 module.container_name)
                    container.stop()
                LOGGER.debug("Container stopped:" + module.container_name)
        except docker.errors.NotFound:
            pass