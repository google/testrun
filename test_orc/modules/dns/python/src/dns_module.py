#!/usr/bin/env python3

import subprocess
from test_module import TestModule

LOG_NAME = "test_dns"
CAPTURE_FILE = "/runtime/network/dns.pcap"
LOGGER = None


class DNSModule(TestModule):

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    self._dns_server = "10.10.10.4"
    global LOGGER
    LOGGER = self._get_logger()

  def _check_dns_traffic(self, tcpdump_filter):
    to_dns = self._exec_tcpdump(tcpdump_filter)
    num_query_dns = len(to_dns)
    LOGGER.info("DNS queries found: " + str(num_query_dns))
    dns_traffic_detected = len(to_dns) > 0
    LOGGER.info("DNS traffic detected: " + str(dns_traffic_detected))
    return dns_traffic_detected

  def _dns_network_from_dhcp(self):
    LOGGER.info("Checking DNS traffic for configured DHCP DNS server: " +
                self._dns_server)

    # Check if the device DNS traffic is to appropriate server
    tcpdump_filter = "dst port 53 and dst host {} and ether src {}".format(
        self._dns_server, self._device_mac)

    result = self._check_dns_traffic(tcpdump_filter=tcpdump_filter)

    LOGGER.info("DNS traffic detected to configured DHCP DNS server: " +
                str(result))
    return result

  def _dns_network_from_device(self):
    LOGGER.info("Checking DNS traffic from device: " + self._device_mac)

    # Check if the device DNS traffic is to appropriate server
    tcpdump_filter = "dst port 53 and ether src {}".format(self._device_mac)

    result = self._check_dns_traffic(tcpdump_filter=tcpdump_filter)

    LOGGER.info("DNS traffic detected from device: " + str(result))
    return result

  def _exec_tcpdump(self, tcpdump_filter):
    """
    Args
        tcpdump_filter: Filter to pass onto tcpdump file
        capture_file: Optional capture file to look
    Returns
        List of packets matching the filter
    """
    command = "tcpdump -tttt -n -r {} {}".format(CAPTURE_FILE, tcpdump_filter)

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
