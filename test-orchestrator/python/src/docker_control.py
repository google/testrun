#!/usr/bin/env python3

import logger
import docker
import os
import json
from docker.types import Mount

LOGGER = logger.get_logger('docker_cntl')
MODULES_DIR = "modules"
MODULE_CONFIG = "conf/module_config.json"


class DockerControl:

    def __init__(self):
        self._modules = []

        #Resolve the path to the test-orchestrator folder
        self._path = os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.realpath(__file__))))
        
        #Resolve the path to the test-run folder
        self._root_path = os.path.abspath(os.path.join(self._path,os.pardir))

        LOGGER.info("Orchestrator path: " + self._root_path)

    def _build_modules(self):
        LOGGER.info("Building docker images...")
        for module in self._modules:
            self._build_module(module)

    def _build_module(self, module):
        LOGGER.debug("Building docker image for module " + module.dir_name)
        client = docker.from_env()
        client.images.build(
            dockerfile=os.path.join(module.dir, module.build_file),
            path=self._path,
            forcerm=True,# Cleans up intermediate containers during build
            tag=module.image_name
        )

    def _get_module_container(self, module):
        LOGGER.debug("Resolving test module container: " +
                     module.container_name)
        container = None
        try:
            client = docker.from_env()
            container = client.containers.get(module.container_name)
        except docker.errors.NotFound:
            LOGGER.debug("Container " +
                         module.container_name + " not found")
        except Exception as e:
            LOGGER.error("Failed to resolve container")
            LOGGER.error(e)
        return container

    def _start_modules(self):
        LOGGER.info("Starting test modules")
        for module in self._modules:
                # Test modules may just be Docker images, so we do not want to start them as containers
                if not module.enable_container:
                    continue

                self._start_module(module)

        LOGGER.info("All network services are running")

    def _start_module(self, module):

        LOGGER.debug("Starting test module " + module.display_name)
        try:
            client = docker.from_env()
            module.container = client.containers.run(
                module.image_name,
                auto_remove=True,
                cap_add=["NET_ADMIN"],
                name=module.container_name,
                hostname=module.container_name,
                privileged=True,
                detach=True,
                mounts=module.mounts,
                environment={"HOST_USER": os.getlogin()}
            )
        except Exception as client_error:
            LOGGER.error("Container run error")
            LOGGER.error(client_error)

    def _stop_modules(self, kill=False):
        LOGGER.info("Stopping test modules")
        for module in self._modules:
            # Test modules may just be Docker images, so we do not want to stop them
            if not module.enable_container:
                continue
            self._stop_module(module, kill)

    def _stop_module(self, module, kill=False):
        LOGGER.debug("Stopping test module " + module.container_name)
        try:
            container = self._get_module_container(module)
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
        except Exception as error:
            LOGGER.error("Container stop error")
            LOGGER.error(error)
  

    def load_modules(self):
        modules_dir = os.path.join(self._path, MODULES_DIR)
        LOGGER.debug("Loading modules from /" + modules_dir)

        loaded_modules = "Loaded the following test modules: "
        for module_dir in os.listdir(modules_dir):

            LOGGER.debug("Loading Module from: " + module_dir)
            # Load basic module information
            module = Module()
            module_json = json.load(open(os.path.join(
                self._path, modules_dir, module_dir, MODULE_CONFIG), encoding='UTF-8'))
            LOGGER.debug(module_json)
            module.name = module_json['config']['meta']['name']
            module.display_name = module_json['config']['meta']['display_name']
            module.description = module_json['config']['meta']['description']
            module.dir = os.path.join(
                self._path, modules_dir, module_dir)
            module.dir_name = module_dir
            module.build_file = module_dir + ".Dockerfile"
            module.container_name = "tr-ct-" + module.dir_name + "-test"
            module.image_name = "test-run/" + module.dir_name + "-test"

            # Attach folder mounts to network module
            if "docker" in module_json['config']:
                if "mounts" in module_json['config']['docker']:
                    for mount_point in module_json['config']['docker']['mounts']:
                        module.mounts.append(Mount(
                            target=mount_point['target'],
                            source=os.path.join(
                                self._root_path, mount_point['source']),
                            type='bind'
                        ))

            # Determine if this is a container or just an image/template
            if "enable_container" in module_json['config']['docker']:
                module.enable_container = module_json['config']['docker']['enable_container']

            self._modules.append(module)

            loaded_modules += module.dir_name + " "

        LOGGER.info(loaded_modules)


class Module:

    def __init__(self):
        self.name = None
        self.display_name = None
        self.description = None

        self.container = None
        self.container_name = None
        self.image_name = None

        # Absolute path
        self.dir = None
        self.dir_name = None
        self.build_file = None
        self.mounts = []

        self.enable_container = True
