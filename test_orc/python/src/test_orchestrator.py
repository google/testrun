"""Provides high level management of the test orchestrator."""
import getpass
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

  def __init__(self, net_orc):
    self._test_modules = []
    self._module_config = None
    self._net_orc = net_orc

    self._path = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

    # Resolve the path to the test-run folder
    self._root_path = os.path.abspath(os.path.join(self._path, os.pardir))

    shutil.rmtree(os.path.join(self._root_path, RUNTIME_DIR),
                  ignore_errors=True)
    os.makedirs(os.path.join(self._root_path, RUNTIME_DIR), exist_ok=True)

  def start(self):
    LOGGER.info("Starting Test Orchestrator")
    self._load_test_modules()
    self.build_test_modules()

  def stop(self):
    """Stop any running tests"""
    self._stop_modules()

  def run_test_modules(self, device):
    """Iterates through each test module and starts the container."""
    LOGGER.info(
        f"Running test modules on device with mac addr {device.mac_addr}")
    for module in self._test_modules:
      self._run_test_module(module, device)
    LOGGER.info("All tests complete")
    LOGGER.info(
        f"Completed running test modules on device with mac addr {device.mac_addr}")
    results = self._generate_results(device)

  def _generate_results(self, device):
    results = {}
    results["device"] = {}
    if device.make is not None:
      results["device"]["make"] = device.make
    if device.make is not None:
      results["device"]["model"] = device.model
    results["device"]["mac_addr"] = device.mac_addr
    for module in self._test_modules:
      if module.enable_container and self._is_module_enabled(module,device):
        container_runtime_dir = os.path.join(
            self._root_path, 'runtime/test/' + device.mac_addr.replace(':', '') +
            '/' + module.name)
        results_file = container_runtime_dir + '/' + module.name + '-result.json'
        try:
          with open(results_file, 'r', encoding='UTF-8') as f:
            module_results = json.load(f)
            results[module.name] = module_results
        except (FileNotFoundError, PermissionError, json.JSONDecodeError) as results_error:
          LOGGER.error("Module Results Errror " + module.name)
          LOGGER.debug(results_error)

    out_file = os.path.join(
          self._root_path, 'runtime/test/' + device.mac_addr.replace(':', '') + '/results.json')
    with open(out_file, 'w') as f:
        json.dump(results,f,indent=2)
    return results

  def _is_module_enabled(self,module,device):
    enabled = True
    if device.test_modules is not None:
      test_modules = json.loads(device.test_modules)
      if module.name in test_modules:
        if 'enabled' in test_modules[module.name]:
          enabled = test_modules[module.name]["enabled"]
    return enabled

  def _run_test_module(self, module, device):
    """Start the test container and extract the results."""

    if module is None or not module.enable_container:
      return

    if not self._is_module_enabled(module,device):
      return

    LOGGER.info("Running test module " + module.name)

    try:
      container_runtime_dir = os.path.join(
          self._root_path, "runtime/test/" + device.mac_addr.replace(":", "") +
          "/" + module.name)
      network_runtime_dir = os.path.join(self._root_path, "runtime/network")
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
          mounts=[
              Mount(target="/runtime/output",
                    source=container_runtime_dir,
                    type='bind'),
              Mount(target="/runtime/network",
                    source=network_runtime_dir,
                    type='bind',
                    read_only=True),
          ],
          environment={
              "HOST_USER": getpass.getuser(),
              "DEVICE_MAC": device.mac_addr,
              "DEVICE_TEST_MODULES": device.test_modules,
              "IPV4_SUBNET": self._net_orc.network_config.ipv4_network,
              "IPV6_SUBNET": self._net_orc.network_config.ipv6_network
          })
    except (docker.errors.APIError,
            docker.errors.ContainerError) as container_error:
      LOGGER.error("Test module " + module.name + " has failed to start")
      LOGGER.debug(container_error)
      return

    # Mount the test container to the virtual network if requried
    if module.network:
      LOGGER.debug("Attaching test module to the network")
      self._net_orc._attach_test_module_to_network(module)

    # Determine the module timeout time
    test_module_timeout = time.time() + module.timeout
    status = self._get_module_status(module)

    while time.time() < test_module_timeout and status == 'running':
      time.sleep(1)
      status = self._get_module_status(module)

    LOGGER.info("Test module " + module.name + " has finished")

  def _get_module_status(self, module):
    container = self._get_module_container(module)
    if container is not None:
      return container.status
    return None

  def _get_test_module(self, name):
    for test_module in self._test_modules:
      if name == test_module.display_name or name == test_module.name or name == test_module.dir_name:
        return test_module
    return None

  def _get_module_container(self, module):
    container = None
    try:
      client = docker.from_env()
      container = client.containers.get(module.container_name)
    except docker.errors.NotFound:
      LOGGER.debug("Container " + module.container_name + " not found")
    except docker.errors.APIError as error:
      LOGGER.error("Failed to resolve container")
      LOGGER.error(error)
    return container

  def _load_test_modules(self):
    """Load network modules from module_config.json."""
    LOGGER.debug("Loading test modules from /" + TEST_MODULES_DIR)

    loaded_modules = "Loaded the following test modules: "
    test_modules_dir = os.path.join(self._path, TEST_MODULES_DIR)

    for module_dir in os.listdir(test_modules_dir):

      if self._get_test_module(module_dir) is None:
        loaded_module = self._load_test_module(module_dir)
        loaded_modules += loaded_module.dir_name + " "

    LOGGER.info(loaded_modules)

  def _load_test_module(self, module_dir):
    """Import module configuration from module_config.json."""

    modules_dir = os.path.join(self._path, TEST_MODULES_DIR)

    # Load basic module information
    module = TestModule()
    with open(os.path.join(self._path, modules_dir, module_dir, MODULE_CONFIG),
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
      module.enable_container = module_json['config']['docker'][
          'enable_container']

    if "depends_on" in module_json['config']['docker']:
      depends_on_module = module_json['config']['docker']['depends_on']
      if self._get_test_module(depends_on_module) is None:
        self._load_test_module(depends_on_module)

    self._test_modules.append(module)
    return module

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
          forcerm=True,  # Cleans up intermediate containers during build
          tag=module.image_name)
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
          LOGGER.debug("Killing container:" + module.container_name)
          container.kill()
        else:
          LOGGER.debug("Stopping container:" + module.container_name)
          container.stop()
        LOGGER.debug("Container stopped:" + module.container_name)
    except docker.errors.NotFound:
      pass
