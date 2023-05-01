#!/usr/bin/env python3

import json
import time
import logger
import subprocess
import os

LOG_NAME = "test_dns"
RESULTS_DIR = "/runtime/output/"
LOGGER = logger.get_logger(LOG_NAME)
CAPTURE_FILE = "/runtime/network/dns.pcap"


class DNSModule:

    def __init__(self, module):
        self._dns_server = "10.10.10.4"
        self._device_mac = os.environ['DEVICE_MAC']
        self._dns_resolution_test = False
        self._dns_dhcp_server_test = False
        self.module = module
        self.add_logger(module)

    def add_logger(self, module):
        global LOGGER
        LOGGER = logger.get_logger(LOG_NAME, module)

    # Run all the DNS Tests
    def run_tests(self):
        LOGGER.info("Checking for DNS traffic from DHCP provided server")
        self._check_dns_traffic_from_device()
        self._check_dns_traffic_to_server()

    def generate_results(self):
        LOGGER.info("Generating test results")
        results = []
        results.append(self.generate_result(
            "DNS resolution test", self._dns_resolution_test))
        results.append(self.generate_result(
            "DNS DHCP server test", self._dns_dhcp_server_test))
        json_results = json.dumps({"results": results}, indent=2)
        self.write_results(json_results)

    def write_results(self, results):
        results_file = RESULTS_DIR + self.module + "-result.json"
        LOGGER.info("Writing results to " + results_file)
        f = open(results_file, "w", encoding="utf-8")
        f.write(results)
        f.close()

    def generate_result(self, test_name, test_result):
        if test_result is not None:
            result = "compliant" if test_result else "non-compliant"
        else:
            result = "skipped"
        LOGGER.info(test_name + ": " + result)
        res_dict = {
            "name": test_name,
            "result": result,
            "description": "The device is " + result
        }
        return res_dict

    def _check_dns_traffic(self, tcpdump_filter):
        to_dns = self._exec_tcpdump(tcpdump_filter)
        num_query_dns = len(to_dns)
        LOGGER.info("DNS queries found: " + str(num_query_dns))
        dns_traffic_detected = len(to_dns) > 0
        LOGGER.info("DNS traffic detected: " + str(dns_traffic_detected))
        return dns_traffic_detected

    def _check_dns_traffic_to_server(self):
        LOGGER.info(
            "Checking DNS traffic for configured DHCP DNS server: " + self._dns_server)

        # Check if the device DNS traffic is to appropriate server
        tcpdump_filter = 'dst port 53 and dst host {} and ether src {}'.format(
            self._dns_server, self._device_mac)

        self._dns_dhcp_server_test = self._check_dns_traffic(
            tcpdump_filter=tcpdump_filter)

        if self._dns_dhcp_server_test:
            LOGGER.info("DNS traffic detected to configured DHCP DNS server")

    def _check_dns_traffic_from_device(self):
        LOGGER.info("Checking DNS traffic from device: " + self._device_mac)

        # Check if the device DNS traffic is to appropriate server
        tcpdump_filter = 'dst port 53 and ether src {}'.format(
            self._device_mac)

        self._dns_resolution_test = self._check_dns_traffic(
            tcpdump_filter=tcpdump_filter)

        if self._dns_resolution_test:
            LOGGER.info("DNS traffic detected from device")

    def _exec_tcpdump(self, tcpdump_filter):
        """
        Args
            tcpdump_filter: Filter to pass onto tcpdump file
            capture_file: Optional capture file to look
        Returns
            List of packets matching the filter
        """
        command = 'tcpdump -tttt -n -r {} {}'.format(
            CAPTURE_FILE, tcpdump_filter)

        LOGGER.debug("tcpdump command: " + command)

        process = subprocess.Popen(command,
                                   universal_newlines=True,
                                   shell=True,
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)
        text = str(process.stdout.read()).rstrip()

        LOGGER.debug("tcpdump response: " + text)

        if text:
            return text.split("\n")

        return []
