#!/usr/bin/env python3

import time
from test_module import TestModule

LOG_NAME = "test_nmap"
LOGGER = None

class NmapModule(TestModule):

    def __init__(self, module):
        super().__init__(module_name=module, log_name=LOG_NAME)
        global LOGGER
        LOGGER = self._get_logger()

    def _nmap_scan(self):
        LOGGER.info(
            "Running nmap scan test")
        time.sleep(30)
        LOGGER.info("nmap scan test finished")
        return True
