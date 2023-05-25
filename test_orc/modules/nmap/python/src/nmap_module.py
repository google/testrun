#!/usr/bin/env python3

import time
import util
import json
import threading
from test_module import TestModule

LOG_NAME = "test_nmap"
LOGGER = None


class NmapModule(TestModule):

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    self._unallowed_ports = []
    self._scan_tcp_results = None
    self._udp_tcp_results = None
    self._script_scan_results = None
    global LOGGER
    LOGGER = self._get_logger()

  def _security_nmap_ports(self, config):
    LOGGER.info(
        "Running security.nmap.ports test")

    # Delete the enabled key from the config if it exists
    # to prevent it being treated as a test key
    if "enabled" in config:
      del config["enabled"]

    if self._device_ipv4_addr is not None:
      # Run the monitor method asynchronously to keep this method non-blocking
      self._tcp_scan_thread = threading.Thread(
          target=self._scan_tcp_ports, args=(config,))
      self._udp_scan_thread = threading.Thread(
          target=self._scan_udp_ports, args=(config,))
      self._script_scan_thread = threading.Thread(
          target=self._scan_scripts, args=(config,))

      self._tcp_scan_thread.daemon = True
      self._udp_scan_thread.daemon = True
      self._script_scan_thread.daemon = True

      self._tcp_scan_thread.start()
      self._udp_scan_thread.start()
      self._script_scan_thread.start()

      while self._tcp_scan_thread.is_alive() or self._udp_scan_thread.is_alive() or self._script_scan_thread.is_alive():
        time.sleep(1)

      LOGGER.debug("TCP scan results: " + str(self._scan_tcp_results))
      LOGGER.debug("UDP scan results: " + str(self._scan_udp_results))
      LOGGER.debug("Service scan results: " +
                    str(self._script_scan_results))
      self._process_port_results(
          tests=config)
      LOGGER.info("Unallowed Ports: " + str(self._unallowed_ports))
      LOGGER.info("Script scan results:\n" +
                  json.dumps(self._script_scan_results))
      return len(self._unallowed_ports) == 0
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
    if self._script_scan_results is not None:
      scan_results.update(self._script_scan_results)
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

  def _scan_scripts(self, tests):
    scan_results = {}
    LOGGER.info("Checing for scan scripts")
    for test in tests:
      test_config = tests[test]
      if "tcp_ports" in test_config:
        for port in test_config["tcp_ports"]:
          port_config = test_config["tcp_ports"][port]
          if "service_scan" in port_config:
            LOGGER.info("Service Scan Detected for: " + str(port))
            svc = port_config["service_scan"]
            scan_results.update(
              self._scan_tcp_with_script(svc["script"]))
      if "udp_ports" in test_config:
        for port in test_config["udp_ports"]:
          if "service_scan" in port:
            LOGGER.info("Service Scan Detected for: " + str(port))
            svc = port["service_scan"]
            self._scan_udp_with_script(svc["script"], port)
            scan_results.update(
              self._scan_tcp_with_script(svc["script"]))
    self._script_scan_results = scan_results

  def _scan_tcp_with_script(self, script_name, ports=None):
    LOGGER.info("Running TCP nmap scan with script " + script_name)
    scan_options = " -v -n T3 --host-timeout=6m -A --script " + script_name
    port_options = " --open "
    if ports is None:
      port_options += " -p- "
    else:
      port_options += " -p" + ports + " "
    results_file = f"/runtime/output/{self._module_name}-script_name.log"
    nmap_options = scan_options + port_options + " -oG " + results_file
    nmap_results, err = util.run_command(
      "nmap " + nmap_options + " " + self._device_ipv4_addr)
    LOGGER.info("Nmap TCP script scan complete")
    LOGGER.info("nmap script results\n" + str(nmap_results))
    return self._process_nmap_results(nmap_results=nmap_results)

  def _scan_udp_with_script(self, script_name, ports=None):
    LOGGER.info("Running UDP nmap scan with script " + script_name)
    scan_options = " --sU -Pn -n --script " + script_name
    port_options = " --open "
    if ports is None:
      port_options += " -p- "
    else:
      port_options += " -p" + ports + " "
    nmap_options = scan_options + port_options
    nmap_results = util.run_command(
      "nmap " + nmap_options + self._device_ipv4_addr)[0]
    LOGGER.info("Nmap UDP script scan complete")
    LOGGER.info("nmap script results\n" + str(nmap_results))
    return self._process_nmap_results(nmap_results=nmap_results)

  def _scan_tcp_ports(self, tests):
    max_port = 1000
    ports = []
    for test in tests:
      test_config = tests[test]
      if "tcp_ports" in test_config:
        for port in test_config["tcp_ports"]:
          if int(port) > max_port:
            ports.append(port)
    ports_to_scan = "1-" + str(max_port)
    if len(ports) > 0:
      ports_to_scan += "," + ",".join(ports)
    LOGGER.info("Running nmap TCP port scan")
    LOGGER.info("TCP ports: " + str(ports_to_scan))
    nmap_results = util.run_command(
      f"""nmap -sT -sV -Pn -v -p {ports_to_scan} 
      --version-intensity 7 -T4 {self._device_ipv4_addr}""")[0]
    LOGGER.info("TCP port scan complete")
    self._scan_tcp_results = self._process_nmap_results(
      nmap_results=nmap_results)

  def _scan_udp_ports(self, tests):
    ports = []
    for test in tests:
      test_config = tests[test]
      if "udp_ports" in test_config:
        for port in test_config["udp_ports"]:
          ports.append(port)
    if len(ports) > 0:
      port_list = ",".join(ports)
      LOGGER.info("Running nmap UDP port scan")
      LOGGER.info("UDP ports: " + str(port_list))
      nmap_results = util.run_command(
        f"nmap -sU -sV -p {port_list} {self._device_ipv4_addr}")[0]
      LOGGER.info("UDP port scan complete")
      self._scan_udp_results = self._process_nmap_results(
          nmap_results=nmap_results)

  def _process_nmap_results(self, nmap_results):
    results = {}
    LOGGER.info("nmap results\n" + str(nmap_results))
    if nmap_results:
      if "Service Info" in nmap_results:
        rows = nmap_results.split("PORT")[1].split(
          "Service Info")[0].split("\n")
      elif "PORT" in nmap_results:
        rows = nmap_results.split("PORT")[1].split(
          "MAC Address")[0].split("\n")
      if rows:
        for result in rows[1:-1]:  # Iterate skipping the header and tail rows
          cols = result.split()
          port = cols[0].split("/")[0]
          # If results do not start with a a port number,
          # it is likely a bleed over from previous result so
          # we need to ignore it
          if port.isdigit():
            version = ""
            if len(cols) > 3:
              # recombine full version information that may contain spaces
              version = " ".join(cols[3:])
            port_result = {cols[0].split(
              "/")[0]: {"state": cols[1], 
                        "service": cols[2], 
                        "version": version}}
            results.update(port_result)
    return results
