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

""" Test assertions for CI testing of tests """
# Temporarily disabled because using Pytest fixtures
# TODO refactor fixtures to not trigger error
# pylint: disable=redefined-outer-name

import json
import os
from pathlib import Path
import pytest
import glob

TEST_MATRIX = "test_tests.json"
RESULTS_PATH = "/tmp/results/*.json"


def collect_expected_results(expected_results):
  """ Yields results from expected_results property of the test matrix"""
  collected_expected_results = {}
  for name, result in expected_results.items():
    collected_expected_results.update({name: result})
  return collected_expected_results


def collect_actual_results(results_dict):
  """ Yields results from an already loaded testrun results file """
  collected_actual_results = {}
  # "module"."results".[list]."result"
  for test in results_dict.get("tests", {}).get("results", []):
    collected_actual_results.update({test["name"]: test["result"]})
  return collected_actual_results


@pytest.fixture
def test_matrix():
  basedir = os.path.dirname(os.path.abspath(__file__))
  with open(os.path.join(basedir, TEST_MATRIX), encoding="utf-8") as f:
    return json.load(f)


@pytest.fixture
def results():
  results = {}
  for file in [Path(x) for x in glob.glob(RESULTS_PATH)]:
    with open(file, encoding="utf-8") as f:
      results[file.stem] = json.load(f)
  return results

@pytest.mark.skip()
class Test:
  @staticmethod
  @pytest.mark.skip()
  def tester1(results, test_matrix):
    ''' Gathers expected and actual results and returns them as dictionaries'''
    expected_result = collect_expected_results(
      test_matrix["tester4"]["expected_results"]) 
    actual_result = collect_actual_results(results["test_device_4"])
    return expected_result, actual_result
  @staticmethod
  @pytest.mark.skip()
  def tester2(results, test_matrix):
    ''' Gathers expected and actual results and returns them as dictionaries'''
    expected_result = collect_expected_results(
      test_matrix["tester5"]["expected_results"]) 
    actual_result = collect_actual_results(results["test_device_5"])
    return expected_result, actual_result

@pytest.fixture
def test():
  return Test


def test_security_services_ftp_compliant(test, results, test_matrix):
  module = "security.services.ftp"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_services_tftp_compliant(test, results, test_matrix):
  module = "security.services.tftp"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_services_smtp_compliant(test, results, test_matrix):
  module = "security.services.smtp"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_services_pop_compliant(test, results, test_matrix):
  module = "security.services.pop"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_services_imap_compliant(test, results, test_matrix):
  module = "security.services.imap"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_ssh_version_compliant(test, results, test_matrix):
  module = "security.ssh.version"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_services_http_compliant(test, results, test_matrix):
  module = "security.services.http"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_services_telnet_compliant(test, results, test_matrix):
  module = "security.services.telnet"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_services_snmpv3_compliant(test, results, test_matrix):
  module = "security.services.snmpv3"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_security_services_vnc_compliant(test, results, test_matrix):
  module = "security.services.vnc"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_ntp_network_ntp_support_compliant(test, results, test_matrix):
  module = "ntp.network.ntp_support"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_ntp_network_ntp_dhcp_compliant(test, results, test_matrix):
  module = "ntp.network.ntp_dhcp"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_ntp_network_ntp_server_compliant(test, results, test_matrix):
  module = "ntp.network.ntp_server"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_connection_mac_address_compliant(test, results, test_matrix):
  module = "connection.mac_address"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_connection_mac_oui_compliant(test, results, test_matrix):
  module = "connection.mac_oui"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


def test_connection_single_ip_compliant(test, results, test_matrix):
  module = "connection.single_ip"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


# def test_connection_dhcp_address_compliant(test, results, test_matrix):
#   module = "connection.dhcp_address"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_connection_target_ping_compliant(test, results, test_matrix):
#   module = "connection.target_ping"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_connection_private_address_compliant(test, results, test_matrix):
#   module = "connection.private_address"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_connection_shared_address_compliant(test, results, test_matrix):
#   module = "connection.shared_address"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_connection_ipaddr_ip_change_compliant(test, results, test_matrix):
#   module = "connection.ipaddr.ip_change"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_connection_ipaddr_dhcp_failover_compliant(
# test, results, test_matrix):
#   module = "connection.ipaddr.dhcp_failover"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_connection_ipv6_slaac_compliant(test, results, test_matrix):
#   module = "connection.ipv6_slaac"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_connection_ipv6_ping_compliant(test, results, test_matrix):
#   module = "connection.ipv6_ping"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


def test_dns_network_hostname_resolution_compliant(test, results, test_matrix):
  module = "dns.network.hostname_resolution"
  expected, actual = test.tester1(results, test_matrix)
  assert expected[module] == actual[module] == "Compliant"


# def test_protocol_valid_bacnet_compliant(test, results, test_matrix):
#   module = "protocol.valid_bacnet"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_protocol_bacnet_version_compliant(test, results, test_matrix):
#   module = "protocol.bacnet.version"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_protocol_valid_modbus_compliant(test, results, test_matrix):
#   module = "protocol.valid_modbus"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_security_tls_v1_2_server_compliant(test, results, test_matrix):
#   module = "security.tls.v1_2_server"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


# def test_security_tls_v1_2_client_compliant(test, results, test_matrix):
#   module = "security.tls.v1_2_client"
#   expected, actual = test.tester1(results, test_matrix)
#   assert expected[module] == actual[module] == "Compliant"


######################################################################


# def test_security_services_ftp_non_compliant(test, results, test_matrix):
#   module = "security.services.ftp"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_services_tftp_non_compliant(test, results, test_matrix):
#   module = "security.services.tftp"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_services_smtp_non_compliant(test, results, test_matrix):
#   module = "security.services.smtp"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_services_pop_non_compliant(test, results, test_matrix):
#   module = "security.services.pop"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_services_imap_non_compliant(test, results, test_matrix):
#   module = "security.services.imap"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_ssh_version_non_compliant(test, results, test_matrix):
#   module = "security.ssh.version"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_services_http_non_compliant(test, results, test_matrix):
#   module = "security.services.http"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module]  == actual[module] == "Non-Compliant"


# def test_security_services_telnet_non_compliant(test, results, test_matrix):
#   module = "security.services.telnet"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_services_snmpv3_non_compliant(test, results, test_matrix):
#   module = "security.services.snmpv3"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_services_vnc_non_compliant(test, results, test_matrix):
#   module = "security.services.vnc"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


def test_ntp_network_ntp_support_non_compliant(test, results, test_matrix):
  module = "ntp.network.ntp_support"
  expected, actual = test.tester2(results, test_matrix)
  assert expected[module] == actual[module] == "Non-Compliant"


def test_ntp_network_ntp_dhcp_non_compliant(test, results, test_matrix):
  module = "ntp.network.ntp_dhcp"
  expected, actual = test.tester2(results, test_matrix)
  assert expected[module] == actual[module] == "Non-Compliant"


# def test_ntp_network_ntp_server_non_compliant(test, results, test_matrix):
#   module = "ntp.network.ntp_server"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_connection_mac_address_non_compliant(test, results, test_matrix):
#   module = "connection.mac_address"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


def test_connection_mac_oui_non_compliant(test, results, test_matrix):
  module = "connection.mac_oui"
  expected, actual = test.tester2(results, test_matrix)
  assert expected[module] == actual[module] == "Non-Compliant"


# def test_connection_single_ip_non_compliant(test, results, test_matrix):
#   module = "connection.single_ip"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_connection_dhcp_address_non_compliant(test, results, test_matrix):
#   module = "connection.dhcp_address"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


def test_connection_target_ping_non_compliant(test, results, test_matrix):
  module = "connection.target_ping"
  expected, actual = test.tester2(results, test_matrix)
  assert expected[module] == actual[module] == "Non-Compliant"


# def test_connection_private_address_non_compliant(test, results, test_matrix):
#   module = "connection.private_address"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_connection_shared_address_non_compliant(test, results, test_matrix):
#   module = "connection.shared_address"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_connection_ipaddr_ip_change_non_compliant(
# test, results, test_matrix):
#   module = "connection.ipaddr.ip_change"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_connection_ipaddr_dhcp_failover_non_compliant(
# test, results, test_matrix):
#   module = "connection.ipaddr.dhcp_failover"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


def test_connection_ipv6_slaac_non_compliant(test, results, test_matrix):
  module = "connection.ipv6_slaac"
  expected, actual = test.tester2(results, test_matrix)
  assert expected[module] == actual[module] == "Non-Compliant"


def test_connection_ipv6_ping_non_compliant(test, results, test_matrix):
  module = "connection.ipv6_ping"
  expected, actual = test.tester2(results, test_matrix)
  assert expected[module] == actual[module] == "Non-Compliant"


def test_dns_network_hostname_resolution_non_compliant(
    test, results, test_matrix):
  module = "dns.network.hostname_resolution"
  expected, actual = test.tester2(results, test_matrix)
  assert expected[module] == actual[module] == "Non-Compliant"


# def test_protocol_valid_bacnet_non_compliant(test, results, test_matrix):
#   module = "protocol.valid_bacnet"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_protocol_bacnet_version_non_compliant(test, results, test_matrix):
#   module = "protocol.bacnet.version"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


def test_protocol_valid_modbus_non_compliant(test, results, test_matrix):
  module = "protocol.valid_modbus"
  expected, actual = test.tester2(results, test_matrix)
  assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_tls_v1_2_server_non_compliant(test, results, test_matrix):
#   module = "security.tls.v1_2_server"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"


# def test_security_tls_v1_2_client_non_compliant(test, results, test_matrix):
#   module = "security.tls.v1_2_client"
#   expected, actual = test.tester2(results, test_matrix)
#   assert expected[module] == actual[module] == "Non-Compliant"
