#!/usr/bin/env python3

import time
import util
from test_module import TestModule

LOG_NAME = "test_nmap"
LOGGER = None

class NmapModule(TestModule):

    def __init__(self, module):
        super().__init__(module_name=module, log_name=LOG_NAME)
        global LOGGER
        LOGGER = self._get_logger()

    def _security_services_ftp(self):
        LOGGER.info(
            "Running nmap scan test")
        port_scan_results = self._scan_for_ports("20-21")
        LOGGER.info("Port Scan Results: " + str(port_scan_results))
        LOGGER.info("nmap scan test finished")
        return True

    def _scan_for_ports(self,ports):
        results = []
        text, err = util.run_command("nmap -p" + ports + " " + self._device_ipv4_addr)
        LOGGER.info("nmap result: " + str(text))
        if text:
            rows = text.split("PORT")[1].split("MAC Address")[0].split("\n")
            for result in rows[1:-1]: #Iterate skipping the header and tail rows
                LOGGER.info("Result: " + str(result))
                cols = result.split(" ")
                LOGGER.info("Column: " + str(cols))
                port_result = {"port":cols[0],"state":cols[1],"service":cols[2]}
                results.append(port_result)
        return results

