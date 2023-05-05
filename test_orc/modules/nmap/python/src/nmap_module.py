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
            "Running security.nmap.ports test")
        if self._device_ipv4_addr is not None:
            self._scan_tcp_results = self._scan_tcp_ports(config)
            self._scan_udp_results = self._scan_udp_ports(config)
            LOGGER.debug("TCP scan results: " + str(self._scan_tcp_results))
            LOGGER.debug("UDP scan results: " + str(self._scan_udp_results))
            self._process_port_results(
                tests=config)
            LOGGER.info("Unallowed Ports: " + str(self._unallowed_ports))
            return len(self._unallowed_ports)==0
        else:
            LOGGER.info("Device ip address not resolved, skipping")
            return None

    def _process_port_results(self, tests):
        for test in tests:
            LOGGER.info("Checking results for test: " + str(test))
            self._check_scan_results(test_config=tests[test])

    def _check_scan_results(self, test_config):
        port_config = {}
        if "tcp_ports" in test_config:
            port_config.update(test_config["tcp_ports"])
        elif "udp_ports" in test_config:
            port_config.update(test_config["udp_ports"])
            
        scan_results = {}
        if self._scan_tcp_results is not None:
            scan_results.update(self._scan_tcp_results)
        if self._scan_udp_results is not None:
            scan_results.update(self._scan_udp_results)
        if port_config is not None:
            for port in port_config:
                result = None
                LOGGER.info("Checking port: " + str(port))
                LOGGER.debug("Port config: " + str(port_config[port]))
                if port in scan_results:
                    if scan_results[port]["state"] == "open":
                        if not port_config[port]["allowed"]:
                            LOGGER.info("Unallowed port open")
                            self._unallowed_ports.append(str(port))
                            result = False
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
                    port_config[port]["result"] = "compliant" if result else "non-compliant"
                else:
                    port_config[port]["result"] = "skipped"

    def _scan_tcp_ports(self, tests):
        max_port = 1000
        ports = []
        for test in tests:
            test_config = tests[test]
            if "tcp_ports" in test_config:
                    for port in test_config["tcp_ports"]:
                        if int(port) > max_port:
                            ports.append(port)
        ports_to_scan="1-" + str(max_port)
        if len(ports) > 0:                     
            ports_to_scan += "," + ','.join(ports)
        LOGGER.info("Running nmap TCP port scan")
        LOGGER.info("TCP ports: " + str(ports_to_scan))
        nmap_results, err = util.run_command("nmap -sT -sV -Pn -v -p " + ports_to_scan + " --allports --version-intensity 7 -T4 " + self._device_ipv4_addr)
        LOGGER.info("TCP port scan complete")
        return self._process_nmap_results(nmap_results=nmap_results)

    def _scan_udp_ports(self, tests):
        ports = []
        for test in tests:
            test_config = tests[test]
            if "udp_ports" in test_config:
                    for port in test_config["udp_ports"]:
                        ports.append(port)
        if len(ports) > 0:
            port_list = ','.join(ports)
            LOGGER.info("Running nmap UDP port scan")
            LOGGER.info("UDP ports: " + str(port_list))
            nmap_results, err = util.run_command("nmap -sU -sV -p " + port_list + " " + self._device_ipv4_addr)
            LOGGER.info("UDP port scan complete")
            return self._process_nmap_results(nmap_results=nmap_results)
        return None

    def _process_nmap_results(self,nmap_results):
        results = {}
        LOGGER.debug("nmap results\n" + str(nmap_results))
        if nmap_results:
            if "Service Info" in nmap_results:
                rows = nmap_results.split("PORT")[1].split("Service Info")[0].split("\n")
            else:
                rows = nmap_results.split("PORT")[1].split("MAC Address")[0].split("\n")
            for result in rows[1:-1]:  # Iterate skipping the header and tail rows
                cols = result.split(" ")
                port_result = {cols[0].split(
                    "/")[0]: {"state": cols[1], "service": cols[2], "version":""}}
                if len(cols) > 3:
                    port_result["version"]=cols[3]
                results.update(port_result)
        return results