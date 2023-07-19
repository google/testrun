# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""NMAP test module"""
import time
import util
import json
import threading
import xmltodict
import re
from test_module import TestModule

LOG_NAME = "test_nmap"
LOGGER = None


class NmapModule(TestModule):
  """NMAP Test module"""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    self._unallowed_ports = []
    self._scan_tcp_results = None
    self._udp_tcp_results = None
    self._script_scan_results = None
    global LOGGER
    LOGGER = self._get_logger()


  def _security_nmap_ports(self, config):
    LOGGER.info("Running security.nmap.ports test")

    # Delete the enabled key from the config if it exists
    # to prevent it being treated as a test key
    if "enabled" in config:
      del config["enabled"]

    if self._device_ipv4_addr is not None:
      # Run the monitor method asynchronously to keep this method non-blocking
      self._tcp_scan_thread = threading.Thread(target=self._scan_tcp_ports,
                                               args=(config, ))
      self._udp_scan_thread = threading.Thread(target=self._scan_udp_ports,
                                               args=(config, ))
      self._script_scan_thread = threading.Thread(target=self._scan_scripts,
                                                  args=(config, ))

      self._tcp_scan_thread.daemon = True
      self._udp_scan_thread.daemon = True
      self._script_scan_thread.daemon = True

      self._tcp_scan_thread.start()
      self._udp_scan_thread.start()
      self._script_scan_thread.start()

      while self._tcp_scan_thread.is_alive() or self._udp_scan_thread.is_alive(
      ) or self._script_scan_thread.is_alive():
        time.sleep(1)

      LOGGER.debug("TCP scan results: " + str(self._scan_tcp_results))
      LOGGER.debug("UDP scan results: " + str(self._scan_udp_results))
      LOGGER.debug("Service scan results: " + str(self._script_scan_results))
      self._process_port_results(tests=config)
      LOGGER.info("Unallowed Ports Detected: " + str(self._unallowed_ports))
      self._check_unallowed_port(self._unallowed_ports,config)
      LOGGER.info("Unallowed Ports: " + str(self._unallowed_ports))
      return len(self._unallowed_ports) == 0
    else:
      LOGGER.info("Device ip address not resolved, skipping")
      return None

  def _process_port_results(self, tests):
    scan_results = {}
    if self._scan_tcp_results is not None:
      scan_results.update(self._scan_tcp_results)
    if self._scan_udp_results is not None:
      scan_results.update(self._scan_udp_results)
    if self._script_scan_results is not None:
      scan_results.update(self._script_scan_results)

    self._check_unknown_ports(tests=tests,scan_results=scan_results)

    for test in tests:
      LOGGER.info("Checking scan results for test: " + str(test))
      self._check_scan_results(test_config=tests[test],
                               scan_results=scan_results)

  def _check_unknown_ports(self,tests,scan_results):
    """ Check if any of the open ports detected are not defined
        in the test configurations.  If an open port is detected
        without a configuration associated with it, the default behavior 
        is to mark it as an unallowed port.
    """
    known_ports = []
    for test in tests:
      if "tcp_ports" in tests[test]:
        for port in tests[test]["tcp_ports"]:
         known_ports.append(port)
      if "udp_ports" in tests[test]:
        for port in tests[test]["udp_ports"]:
         known_ports.append(port)

    for port_result in scan_results:
      if not port_result in known_ports:
        LOGGER.info("Unknown port detected: " + port_result)
        unallowed_port = {"port":port_result,
                          "service":scan_results[port_result]["service"],
                          "tcp_udp":scan_results[port_result]["tcp_udp"]}
        #self._unallowed_ports.append(unallowed_port)
        self._add_unknown_ports(tests,unallowed_port)

  def _add_unknown_ports(self,tests,unallowed_port):
    known_service = False
    result = {"description":"Undefined port","allowed":False}
    if unallowed_port["tcp_udp"] == "tcp":
      port_style = "tcp_ports"
    elif unallowed_port["tcp_udp"] == "udp":
      port_style = "udp_ports"

    LOGGER.info("Unknown Port Service: " + unallowed_port["service"])
    for test in tests:
      LOGGER.debug("Checking for known service: " + test)
      # Create a regular expression pattern to match the variable at the 
      # end of the string
      port_service = r"\b" + re.escape(unallowed_port["service"]) + r"\b$"
      service_match = re.search(port_service, test)
      if service_match:
        LOGGER.info("Service Matched: " + test)
        known_service=True
        for test_port in tests[test][port_style]:
          if "version" in tests[test][port_style][test_port]:
            result["version"] = tests[test][port_style][test_port]["version"]
          if "description" in tests[test][port_style][test_port]:
            result["description"] = tests[test][port_style][test_port]["description"]
          result["inherited_from"] = test_port
          if tests[test][port_style][test_port]["allowed"]:
            result["allowed"] = True
            break
        tests[test][port_style][unallowed_port["port"]]=result
        break

    if not known_service:
      service_name = "security.services.unknown." + str(unallowed_port["port"])
      unknown_service = {port_style:{unallowed_port["port"]:result}}
      tests[service_name]=unknown_service


  def _check_scan_results(self,test_config,scan_results):
    if "tcp_ports" in test_config:
      port_config = test_config["tcp_ports"]
      self._check_scan_result(port_config=port_config,scan_results=scan_results)
    if "udp_ports" in test_config:
      port_config = test_config["udp_ports"]
      self._check_scan_result(port_config=port_config,scan_results=scan_results)
      

  def _check_scan_result(self,port_config,scan_results):
    if port_config is not None:
      for port, config in port_config.items():
        result = None
        LOGGER.info("Checking port: " + str(port))
        LOGGER.debug("Port config: " + str(config))
        if port in scan_results:
          if scan_results[port]["state"] == "open":
            if not config["allowed"]:
              LOGGER.info("Unallowed port open")
              self._unallowed_ports.append(
                {"port":str(port),
                "service":str(scan_results[port]["service"]),
                "tcp_udp":scan_results[port]["tcp_udp"]}
                )
              result = False
            else:
              LOGGER.info("Allowed port open")
              if "version" in config and "version" in scan_results[port]:
                version_check = self._check_version(scan_results[port]["service"],
                  scan_results[port]["version"],config["version"])
                if version_check is not None:
                  result = version_check
                else:
                  result = True
              else:
                result = True
          else:
            LOGGER.info("Port is closed")
            result = True
        else:
          LOGGER.info("Port not detected, closed")
          result = True

        if result is not None:
          config["result"] = "compliant" if result else "non-compliant"
        else:
          config["result"] = "skipped"

  def _check_unallowed_port(self,unallowed_ports,tests):
    service_allowed=False
    allowed = False
    version = None
    service = None
    for port in unallowed_ports:
      LOGGER.info("Checking unallowed port: " + port["port"])
      LOGGER.info("Looking for service: " + port["service"])
      LOGGER.debug("Unallowed Port Config: " + str(port))
      if port["tcp_udp"] == "tcp":
        port_style = "tcp_ports"
      elif port["tcp_udp"] == "udp":
        port_style = "udp_ports"
      for test in tests:
        LOGGER.debug("Checking test: " + str(test))
        # Create a regular expression pattern to match the variable at the 
        # end of the string
        port_service = r"\b" + re.escape(port["service"]) + r"\b$"
        service_match = re.search(port_service, test)
        if service_match:
          LOGGER.info("Service Matched: " + test)
          service_config = tests[test]
          service = port["service"]
          for service_port in service_config[port_style]:
            port_config = service_config[port_style][service_port]
            service_allowed |= port_config["allowed"]
            version = port_config["version"] if "version" in port_config else None
            if service_allowed:
              LOGGER.info("Unallowed port detected for allowed service: " + service)
              if version is not None:
                allowed = self._check_version(service=service,
                  version_detected=self._scan_tcp_results[port["port"]]["version"],
                  version_expected=version)
              else:
                allowed = True
              if allowed:
                LOGGER.info("Unallowed port exception for approved service: " + port["port"])
                for u_port in self._unallowed_ports:
                  if port["port"] in u_port["port"]:
                    self._unallowed_ports.remove(u_port)
              break    
          break

  def _check_version(self,service,version_detected,version_expected):
    """Check if the version specified for the service matches what was
       detected by nmap.  Since there is no consistency in how nmap service
       results are returned, each service that needs a checked must be 
       implemented individually.  If a service version is requested
       that is not implemented, this test will provide a skip (None)
       result.
    """
    LOGGER.info("Checking version for service: " + service)
    LOGGER.info("NMAP Version Detected: " + version_detected)            
    LOGGER.info("Version Expected: " + version_expected)   
    version_check = None
    match service:
      case "ssh":
        version_check = f"protocol {version_expected}" in version_detected
      case _:
        LOGGER.info("No version check implemented for service: " + service + ". Skipping")
    LOGGER.info("Version check result: " + str(version_check))
    return version_check

  def _scan_scripts(self, tests):
    scan_results = {}
    LOGGER.info("Checking for scan scripts")
    for test in tests:
      test_config = tests[test]
      if "tcp_ports" in test_config:
        for port in test_config["tcp_ports"]:
          port_config = test_config["tcp_ports"][port]
          if "service_scan" in port_config:
            LOGGER.info("Service Scan Detected for: " + str(port))
            svc = port_config["service_scan"]
            result = self._scan_tcp_with_script(svc["script"])
            scan_results.update(result)
      if "udp_ports" in test_config:
        for port in test_config["udp_ports"]:
          if "service_scan" in port:
            LOGGER.info("Service Scan Detected for: " + str(port))
            svc = port["service_scan"]
            result = self._scan_udp_with_script(svc["script"], port)
            scan_results.update(result)
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
    nmap_options = scan_options + port_options + " " + results_file + " -oX -"
    nmap_results = util.run_command("nmap " + nmap_options + " " +
                                    self._device_ipv4_addr)[0]
    LOGGER.info("Nmap TCP script scan complete")
    nmap_results_json = self._nmap_results_to_json(nmap_results)
    return self._process_nmap_json_results(nmap_results_json=nmap_results_json)

  def _scan_udp_with_script(self, script_name, ports=None):
    LOGGER.info("Running UDP nmap scan with script " + script_name)
    scan_options = " --sU -Pn -n --script " + script_name
    port_options = " --open "
    if ports is None:
      port_options += " -p- "
    else:
      port_options += " -p" + ports + " "
    nmap_options = scan_options + port_options + " -oX - "
    nmap_results = util.run_command("nmap " + nmap_options +
                                    self._device_ipv4_addr)[0]
    LOGGER.info("Nmap UDP script scan complete")
    nmap_results_json = self._nmap_results_to_json(nmap_results)
    return self._process_nmap_json_results(nmap_results_json=nmap_results_json)

  def _scan_tcp_ports(self):
    max_port = 65535
    LOGGER.info("Running nmap TCP port scan")
    nmap_results = util.run_command(
        f"""nmap --open -sT -sV -Pn -v -p 1-{max_port}
      --version-intensity 7 -T4 -oX - {self._device_ipv4_addr}""")[0]

    LOGGER.info("TCP port scan complete")
    nmap_results_json = self._nmap_results_to_json(nmap_results)
    self._scan_tcp_results = self._process_nmap_json_results(
        nmap_results_json=nmap_results_json)

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
          f"nmap -sU -sV -p {port_list} -oX - {self._device_ipv4_addr}")[0]
      LOGGER.info("UDP port scan complete")
      nmap_results_json = self._nmap_results_to_json(nmap_results)
      self._scan_udp_results = self._process_nmap_json_results(
          nmap_results_json=nmap_results_json)

  def _nmap_results_to_json(self,nmap_results):
    try:
        xml_data = xmltodict.parse(nmap_results)
        json_data = json.dumps(xml_data, indent=4)
        return json.loads(json_data)

    except Exception as e:
        LOGGER.error(f"Error parsing Nmap output: {e}")

  def _process_nmap_json_results(self,nmap_results_json):
    LOGGER.debug("nmap results\n" + json.dumps(nmap_results_json,indent=2))
    results = {}
    if "ports" in nmap_results_json["nmaprun"]["host"]:
      ports = nmap_results_json["nmaprun"]["host"]["ports"] 
      # Checking if an object is a JSON object
      if isinstance(ports["port"], dict):
          results.update(self._json_port_to_dict(ports["port"]))
      elif isinstance(ports["port"], list):
          for port in ports["port"]:
            results.update(self._json_port_to_dict(port))
    return results

  def _json_port_to_dict(self,port_json):
    port_result = {}
    port = {}
    port["tcp_udp"] = port_json["@protocol"]
    port["state"] = port_json["state"]["@state"]
    port["service"] = port_json["service"]["@name"]
    port["version"] = ""
    if "@version" in port_json["service"]:
      port["version"] += port_json["service"]["@version"]
      if "@extrainfo" in port_json["service"]:
        port["version"] += " " + port_json["service"]["@extrainfo"]
    port_result = {port_json["@portid"]:port}
    return port_result
