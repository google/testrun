#!/usr/bin/env python3

import time
import util
import json
from test_module import TestModule

LOG_NAME = "test_nmap"
LOGGER = None


class NmapModule(TestModule):

    def __init__(self, module):
        super().__init__(module_name=module, log_name=LOG_NAME)
        self._unallowed_ports = []
        global LOGGER
        LOGGER = self._get_logger()

    def _security_nmap_ports(self, config):
        
        LOGGER.info(
            "Running nmap scan test")
        if self._device_ipv4_addr is not None:
            self._scan_tcp_results = self._scan_for_tcp_ports()
            LOGGER.info("Port Scan Results: " + str(self._scan_tcp_results))
            LOGGER.info("nmap scan test finished")
            self._process_port_results(
                tests=config)
            LOGGER.info("Unallowed Ports: " + str(self._unallowed_ports))
            return len(self._unallowed_ports)==0
        else:
            LOGGER.info("Device ip address not resolved, skipping")
            return None

    def _process_port_results(self, tests):
        for test in tests:
            LOGGER.info("Running test: " + str(test))
            self._check_scan_results(test_config=tests[test])

    def _check_scan_results(self, test_config):
        if "tcp_ports" in test_config:
            tcp_port_config = test_config["tcp_ports"]

        if tcp_port_config is not None:
            for port in tcp_port_config:
                result = None
                LOGGER.info("Checking Port: " + str(port))
                LOGGER.debug("Port Config: " + str(tcp_port_config[port]))
                if port in self._scan_tcp_results:
                    if self._scan_tcp_results[port]["state"] == "open":
                        if not tcp_port_config[port]["allowed"]:
                            LOGGER.info("Unallowed port open")
                            result = False
                            self._unallowed_ports.append(str(port))
                        else:
                            LOGGER.info("Allowed port open")
                            result = True
                    else:
                        LOGGER.info("Port is closed")
                        result = True
                else:
                    LOGGER.info("Port not detected, closed")
                    result = True

                if result is not None:
                    tcp_port_config[port]["result"] = "compliant" if result else "non-compliant"
                else:
                    tcp_port_config[port]["result"] = "skipped"

        LOGGER.info("Results:\n" + json.dumps(tcp_port_config))

    def _scan_for_tcp_ports(self):
        results = {}
        text, err = util.run_command("nmap " + self._device_ipv4_addr)
        LOGGER.info("nmap results\n" + str(text))
        if text:
            rows = text.split("PORT")[1].split("MAC Address")[0].split("\n")
            for result in rows[1:-1]:  # Iterate skipping the header and tail rows
                cols = result.split(" ")
                port_result = {cols[0].split(
                    "/")[0]: {"state": cols[1], "service": cols[2]}}
                results.update(port_result)
        return results
