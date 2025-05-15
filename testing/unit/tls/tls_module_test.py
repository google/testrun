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
"""Module run all the TLS related unit tests"""
from tls_module import TLSModule
from tls_util import TLSUtil
from common import logger
import os
import unittest
import unittest.mock
from scapy.all import sniff, wrpcap
import threading
import time
import netifaces
import ssl
import shutil
import logging
import socket
import sys
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from unittest.mock import patch

MODULE = 'tls'
# Define the file paths
TEST_FILES_DIR = 'testing/unit/' + MODULE
OUTPUT_DIR = os.path.join(TEST_FILES_DIR, 'output/')
REPORTS_DIR = os.path.join(TEST_FILES_DIR, 'reports/')
CAPTURES_DIR = os.path.join(TEST_FILES_DIR, 'captures/')
CERT_DIR = os.path.join(TEST_FILES_DIR, 'certs/')
ROOT_CERTS_DIR = os.path.join(TEST_FILES_DIR, 'root_certs')

LOCAL_REPORT = os.path.join(REPORTS_DIR, 'tls_report_local.html')
LOCAL_REPORT_SINGLE = os.path.join(REPORTS_DIR, 'tls_report_single.html')
LOCAL_REPORT_EXT = os.path.join(REPORTS_DIR, 'tls_report_ext_local.html')
LOCAL_REPORT_NO_CERT = os.path.join(REPORTS_DIR,
                                    'tls_report_no_cert_local.html')
CONF_FILE = 'modules/test/' + MODULE + '/conf/module_config.json'

INTERNET_IFACE = 'eth0'

TLS_UTIL = None
PACKET_CAPTURE = None


class TLSModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning TLS behaviors"""

  @classmethod
  def setUpClass(cls):
    log = logger.get_logger('unit_test_' + MODULE)
    global TLS_UTIL
    TLS_UTIL = TLSUtil(
        log,
        #bin_dir='modules/test/tls/bin',
        cert_out_dir=OUTPUT_DIR,
        root_certs_dir=ROOT_CERTS_DIR)

  # Setup the default ipv4 address and the scan results
  def setUp(self):
    self.tls_module = TLSModule(module=MODULE)
    self.tls_module._device_ipv4_addr = None # pylint: disable=W0212
    self.tls_module._scan_results = None # pylint: disable=W0212

  def security_tls_v1_2_server_no_ip_test(self):
    """Test _security_tls_v1_2_server when device IP could not be resolved"""

    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    self.assertEqual(result, 'Error')
    self.assertEqual(description, 'Could not resolve device IP address')
    self.assertEqual(details, 'Could not resolve device IP address')

  def security_tls_v1_2_server_no_scan_results_test(self):
    """Tests _security_tls_v1_2_server when scan finds no HTTP/HTTPS ports"""

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212
    self.tls_module._scan_results = {} # pylint: disable=W0212

    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    self.assertEqual(result, 'Feature Not Detected')
    self.assertEqual(description, 'TLS 1.2 certificate could not be validated')
    self.assertEqual(details, 'TLS 1.2 certificate could not be validated')

  def security_tls_v1_2_server_scan_failure_test(self):
    """Tests _security_tls_v1_2_server when scan fails"""

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212

    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    self.assertEqual(result, 'Feature Not Detected')
    self.assertEqual(description, 'TLS 1.2 certificate could not be validated')
    self.assertEqual(details, 'TLS 1.2 certificate could not be validated')

  @patch('tls_module.TLSUtil.validate_tls_server')
  def security_tls_v1_2_server_no_tls_v1_3_test(self, mock_validate_tls_server):
    """Test _security_tls_v1_2_server when TLS 1.3 is not supported"""

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212
    self.tls_module._scan_results = {443 : 'HTTPS'} # pylint: disable=W0212

    # Mock the result of validate_tls_server from TLSUtil
    def validate_side_effect(**kwargs):
      tls_version = kwargs.get('tls_version')
      if tls_version == '1.2':
        return (True, 'Time range valid\nPublic key valid\nSignature valid')
      elif tls_version == '1.3':
        return (None, 'Failed to resolve public certificate')

    mock_validate_tls_server.side_effect = validate_side_effect
    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    self.assertEqual(result, True)
    self.assertEqual(description, 'TLS 1.2 certificate valid on ports: 443')

    expected_details = (
    'TLS 1.2 validated on port 443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    )
    self.assertEqual(details, expected_details)

  @patch('tls_module.TLSUtil.validate_tls_server')
  def security_tls_v1_2_server_no_tls_v1_2_test(self, mock_validate_tls_server):
    """Test _security_tls_v1_2_server when TLS 1.2 is not supported"""

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212
    self.tls_module._scan_results = {443 : 'HTTPS'} # pylint: disable=W0212

    # Mock the result of validate_tls_server from TLSUtil
    def validate_side_effect(**kwargs):
      tls_version = kwargs.get('tls_version')
      if tls_version == '1.2':
        return (None, 'Failed to resolve public certificate')
      elif tls_version == '1.3':
        return (True, 'Time range valid\nPublic key valid\nSignature valid')

    mock_validate_tls_server.side_effect = validate_side_effect
    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    self.assertEqual(result, 'Feature Not Detected')
    self.assertEqual(description, 'TLS 1.2 certificate could not be validated')
    self.assertEqual(details, 'TLS 1.2 certificate could not be validated')

  @patch('tls_module.TLSUtil.validate_tls_server')
  def security_tls_v1_2_server_compliant_invalid_v1_2_cert_test(self,
                              mock_validate_tls_server):
    """
    Test _security_tls_v1_2_server when TLS 1.2 cert is invalid but 
    TLS 1.3 cert is valid
    """

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212
    self.tls_module._scan_results = {443 : 'HTTPS'} # pylint: disable=W0212

    # Mock the result of validate_tls_server from TLSUtil
    def validate_side_effect(**kwargs):
      tls_version = kwargs.get('tls_version')
      if tls_version == '1.2':
        return (False, 'Certificate has expired')
      elif tls_version == '1.3':
        return (True, 'Time range valid\nPublic key valid\nSignature valid')

    mock_validate_tls_server.side_effect = validate_side_effect
    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    # Expects compliant result
    self.assertEqual(result, True)

    expected_description = (
      'TLS 1.2 certificate invalid and TLS 1.3 certificate valid on ports: 443'
    )
    self.assertEqual(description, expected_description )

    expected_details = (
    'TLS 1.2 not validated on port 443: '
    'Certificate has expired'
    '\nTLS 1.3 validated on port 443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    )
    self.assertEqual(details, expected_details)

  @patch('tls_module.TLSUtil.validate_tls_server')
  def security_tls_v1_2_server_non_compliant_invalid_1_2_and_1_3_cert_test(self,
                              mock_validate_tls_server):
    """
    Test _security_tls_v1_2_server when TLS 1.2 and TLS 1.3 certs are invalid
    """

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212
    self.tls_module._scan_results = {443 : 'HTTPS'} # pylint: disable=W0212

    # Mock the result of validate_tls_server from TLSUtil
    def validate_side_effect(**kwargs):
      tls_version = kwargs.get('tls_version')
      if tls_version == '1.2':
        return (False, 'Certificate has expired')
      elif tls_version == '1.3':
        return (False, 'Device certificate has not been signed')

    mock_validate_tls_server.side_effect = validate_side_effect
    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    # Expects compliant result
    self.assertEqual(result, False)
    self.assertEqual(description, 'TLS 1.2 certificate invalid on ports: 443')

    expected_details = (
    'TLS 1.2 not validated on port 443: '
    'Certificate has expired'
    '\nTLS 1.3 not validated on port 443: '
    'Device certificate has not been signed'
    )
    self.assertEqual(details, expected_details)

  @patch('tls_module.TLSUtil.validate_tls_server')
  def security_tls_v1_2_server_v1_2_v1_3_test(self, mock_validate_tls_server):
    """Test _security_tls_v1_2_server TLS 1.2 and TLS 1.3 are supported"""

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212
    self.tls_module._scan_results = {443 : 'HTTPS'} # pylint: disable=W0212

    # Mock the result of validate_tls_server from TLSUtil
    def validate_side_effect(**kwargs):
      tls_version = kwargs.get('tls_version')
      if tls_version in ['1.2', '1.3']:
        return (True, 'Time range valid\nPublic key valid\nSignature valid')

    mock_validate_tls_server.side_effect = validate_side_effect
    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    self.assertEqual(result, True)
    self.assertEqual(description, 'TLS 1.2 certificate valid on ports: 443')

    expected_details = (
    'TLS 1.2 validated on port 443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    '\nTLS 1.3 validated on port 443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    )
    self.assertEqual(details, expected_details)

  @patch('tls_module.TLSUtil.validate_tls_server')
  def security_tls_v1_2_multiple_https_servers_test(self,
                                mock_validate_tls_server):
    """Test _security_tls_v1_2_server when multiple https servers are found"""

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212
    self.tls_module._scan_results = {443 : 'HTTPS', 8443 : 'HTTPS'} # pylint: disable=W0212

    # Mock the result of validate_tls_server from TLSUtil
    def validate_side_effect(**kwargs):
      tls_version = kwargs.get('tls_version')
      if tls_version in ['1.2', '1.3']:
        return (True, 'Time range valid\nPublic key valid\nSignature valid')

    mock_validate_tls_server.side_effect = validate_side_effect
    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    self.assertEqual(result, True)

    expected_description = 'TLS 1.2 certificate valid on ports: 443,8443'
    self.assertEqual(description, expected_description)

    expected_details = (
    'TLS 1.2 validated on port 443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    '\nTLS 1.3 validated on port 443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    'TLS 1.2 validated on port 8443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    '\nTLS 1.3 validated on port 8443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    )
    self.assertEqual(details, expected_details)

  @patch('tls_module.TLSUtil.validate_tls_server')
  def security_tls_v1_2_server_http_test(self, mock_validate_tls_server):
    """Test _security_tls_v1_2_server when http port is found"""

    self.tls_module._device_ipv4_addr = '10.10.10.14' # pylint: disable=W0212
    self.tls_module._scan_results = {443 : 'HTTPS', 80 : 'HTTP'} # pylint: disable=W0212

    # Mock the result of validate_tls_server from TLSUtil
    def validate_side_effect(**kwargs):
      tls_version = kwargs.get('tls_version')
      if tls_version in ['1.2', '1.3']:
        return (True, 'Time range valid\nPublic key valid\nSignature valid')

    mock_validate_tls_server.side_effect = validate_side_effect
    result, description, details = self.tls_module._security_tls_v1_2_server() # pylint: disable=W0212

    self.assertEqual(result, False)
    self.assertEqual(description, 'TLS 1.2 certificate invalid on ports: 80')

    expected_details = (
    'TLS 1.2 validated on port 443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    '\nTLS 1.3 validated on port 443: '
    'Time range valid\n'
    'Public key valid\n'
    'Signature valid'
    '\nHTTP service detected on port 80'
    )
    self.assertEqual(details, expected_details)

  # Test 1.2 server when only 1.2 connection is established
  def security_tls_v1_2_server_test(self):
    tls_1_2_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.2')
    tls_1_3_results = None, 'No TLS 1.3'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results,port=443)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.3 connection is established
  def security_tls_v1_2_for_1_3_server_test(self):
    tls_1_2_results = None, 'No TLS 1.2'
    tls_1_3_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.3')
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results,port=443)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.2 and 1.3 connection is established
  def security_tls_v1_2_for_1_2_and_1_3_server_test(self):
    tls_1_2_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.2')
    tls_1_3_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.3')
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results,port=443)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.2 and failed 1.3 connection is established
  def security_tls_v1_2_for_1_2_and_1_3_fail_server_test(self):
    tls_1_2_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.2')
    tls_1_3_results = False, 'Signature faild'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results,port=443)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.3 and failed 1.2 connection is established
  def security_tls_v1_2_for_1_3_and_1_2_fail_server_test(self):
    tls_1_3_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.3')
    tls_1_2_results = False, 'Signature faild'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results,port=443)
    self.assertTrue(test_results[0])

  def security_tls_server_results_test(self):
    # Generic messages to test they are passing through
    # to the results as expected
    fail_message = 'Certificate not validated'
    success_message = 'Certificate validated'
    none_message = 'Failed to resolve public certificate'

    # Both None
    tls_1_2_results = None, none_message
    tls_1_3_results = None, none_message
    expected = None, (f'TLS 1.2 not validated on port 443: {none_message}\n'
                      f'TLS 1.3 not validated on port 443: {none_message}')
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)
    self.assertEqual(result, expected)

    # TLS 1.2 Pass and TLS 1.3 None
    tls_1_2_results = True, success_message
    expected = True, f'TLS 1.2 validated on port 443: {success_message}'
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)
    self.assertEqual(result, expected)

    # TLS 1.2 Fail and TLS 1.3 None
    tls_1_2_results = False, fail_message
    expected = False, f'TLS 1.2 not validated on port 443: {fail_message}'
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)
    self.assertEqual(result, expected)

    # TLS 1.3 Pass and TLS 1.2 None
    tls_1_2_results = None, fail_message
    tls_1_3_results = True, success_message
    expected = True, f'TLS 1.3 validated on port 443: {success_message}'
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)
    self.assertEqual(result, expected)

    # TLS 1.3 Fail and TLS 1.2 None
    tls_1_3_results = False, fail_message
    expected = False, f'TLS 1.3 not validated on port 443: {fail_message}'
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)
    self.assertEqual(result, expected)

    # TLS 1.2 Pass and TLS 1.3 Pass
    tls_1_2_results = True, success_message
    tls_1_3_results = True, success_message
    expected = True, (f'TLS 1.2 validated on port 443: {success_message}\n'
                      f'TLS 1.3 validated on port 443: {success_message}')
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)

    self.assertEqual(result, expected)

    # TLS 1.2 Pass and TLS 1.3 Fail
    tls_1_2_results = True, success_message
    tls_1_3_results = False, fail_message
    expected = True, (f'TLS 1.2 validated on port 443: {success_message}\n'
                      f'TLS 1.3 not validated on port 443: {fail_message}')
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)
    self.assertEqual(result, expected)

    # TLS 1.2 Fail and TLS 1.2 Pass
    tls_1_2_results = False, fail_message
    tls_1_3_results = True, success_message
    expected = True, (f'TLS 1.2 not validated on port 443: {fail_message}\n'
                      f'TLS 1.3 validated on port 443: {success_message}')
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)
    self.assertEqual(result, expected)

    # TLS 1.2 Fail and TLS 1.2 Fail
    tls_1_3_results = False, fail_message
    expected = False, (f'TLS 1.2 not validated on port 443: {fail_message}\n'
                       f'TLS 1.3 not validated on port 443: {fail_message}')
    result = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                 tls_1_3_results,port=443)
    self.assertEqual(result, expected)

  # Test 1.2 server when 1.3 and 1.2 failed connection is established
  def security_tls_v1_2_fail_server_test(self):
    tls_1_2_results = False, 'Signature faild'
    tls_1_3_results = False, 'Signature faild'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results,port=443)
    self.assertFalse(test_results[0])

    # Test 1.2 server when 1.3 and 1.2 failed connection is established

  def security_tls_v1_2_none_server_test(self):
    tls_1_2_results = None, 'No cert'
    tls_1_3_results = None, 'No cert'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results,port=443)
    self.assertIsNone(test_results[0])

  def security_tls_v1_3_server_test(self):
    test_results = TLS_UTIL.validate_tls_server('google.com', tls_version='1.3')
    self.assertTrue(test_results[0])

  def security_tls_v1_2_client_test(self):
    test_results = self.test_client_tls('1.2')
    print(str(test_results))
    self.assertTrue(test_results[0])

  def security_tls_v1_2_client_cipher_fail_test(self):
    test_results = self.test_client_tls('1.2', disable_valid_ciphers=True)
    print(str(test_results))
    self.assertFalse(test_results[0])

  # Scan a known capture without any TLS traffic to
  # generate a skip result
  def security_tls_client_skip_test(self):
    print('security_tls_client_skip_test')
    capture_file = os.path.join(CAPTURES_DIR, 'no_tls.pcap')

    # Run the client test
    test_results = TLS_UTIL.validate_tls_client(client_mac='00:15:5d:0c:86:b9',
                                                tls_version='1.2',
                                                capture_files=[capture_file])
    print(str(test_results))
    self.assertIsNone(test_results[0])

  def security_tls_v1_3_client_test(self):
    test_results = self.test_client_tls('1.3')
    print(str(test_results))
    self.assertTrue(test_results[0])

  def client_hello_packets_test(self):
    packet_fail = {
        'dst_ip': '10.10.10.1',
        'src_ip': '10.10.10.14',
        'dst_port': '443',
        'cipher_support': {
            'ecdh': False,
            'ecdsa': True
        }
    }
    packet_success = {
        'dst_ip': '10.10.10.1',
        'src_ip': '10.10.10.14',
        'dst_port': '443',
        'cipher_support': {
            'ecdh': True,
            'ecdsa': True
        }
    }
    hello_packets = [packet_fail, packet_success]
    hello_results = TLS_UTIL.process_hello_packets(hello_packets, '1.2')
    print('Hello packets test results: ' + str(hello_results))
    expected = {'valid': [packet_success], 'invalid': []}
    self.assertEqual(hello_results, expected)

  def test_client_tls(self,
                      tls_version,
                      tls_generate=None,
                      disable_valid_ciphers=False):
    # Make the capture file
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    capture_file = OUTPUT_DIR + '/client_tls.pcap'

    # Resolve the client mac used
    client_mac = self.get_interface_mac(INTERNET_IFACE)

    # Genrate TLS outbound traffic
    if tls_generate is None:
      tls_generate = tls_version
    self.generate_tls_traffic(capture_file, tls_generate, disable_valid_ciphers)

    # Run the client test
    return TLS_UTIL.validate_tls_client(client_mac=client_mac,
                                        tls_version=tls_version,
                                        capture_files=[capture_file])

  def test_client_tls_with_non_tls_client(self):
    print('\ntest_client_tls_with_non_tls_client')
    capture_file = os.path.join(CAPTURES_DIR, 'monitor.pcap')

    # Run the client test
    test_results = TLS_UTIL.validate_tls_client(client_mac='70:b3:d5:96:c0:00',
                                                tls_version='1.2',
                                                capture_files=[capture_file])
    print(str(test_results))
    self.assertFalse(test_results[0])

  # Scan a known capture without u unsupported TLS traffic to
  # generate a fail result
  def security_tls_client_unsupported_tls_client(self):
    print('\nsecurity_tls_client_unsupported_tls_client')
    capture_file = os.path.join(CAPTURES_DIR, 'unsupported_tls.pcap')

    # Run the client test
    test_results = TLS_UTIL.validate_tls_client(client_mac='00:15:5d:0c:86:b9',
                                                tls_version='1.2',
                                                capture_files=[capture_file])
    print(str(test_results))
    self.assertFalse(test_results[0])

  # Scan a known capture without u unsupported TLS traffic to
  # generate a fail result
  def security_tls_client_allowed_protocols_test(self):
    print('\nsecurity_tls_client_allowed_protocols_test')
    capture_file = os.path.join(CAPTURES_DIR, 'monitor_with_quic.pcap')

    # Run the client test
    test_results = TLS_UTIL.validate_tls_client(client_mac='e4:5f:01:5f:92:9c',
                                                tls_version='1.2',
                                                capture_files=[capture_file])
    print(str(test_results))
    self.assertTrue(test_results[0])

  def outbound_connections_test(self):
    """ Test generation of the outbound connection ips"""
    print('\noutbound_connections_test')
    capture_file = os.path.join(CAPTURES_DIR, 'monitor.pcap')
    ip_dst = TLS_UTIL.get_all_outbound_connections(
        device_mac='70:b3:d5:96:c0:00', capture_files=[capture_file])
    print(str(ip_dst))
    # Expected set of IPs and ports in tuple format
    expected_ips = {
        ('216.239.35.0', 123),
        ('8.8.8.8', 'Unknown'),
        ('8.8.8.8', 53),
        ('18.140.82.197', 443),
        ('18.140.82.197', 22),
        ('224.0.0.22', 'Unknown'),
        ('18.140.82.197', 80)
    }
    # Compare as sets since returned order is not guaranteed
    self.assertEqual(
        set(ip_dst),
        expected_ips)

  def outbound_connections_report_test(self):
    """ Test generation of the outbound connection ips"""
    print('\noutbound_connections_report_test')
    capture_file = os.path.join(CAPTURES_DIR, 'monitor.pcap')
    ip_dst = TLS_UTIL.get_all_outbound_connections(
        device_mac='70:b3:d5:96:c0:00', capture_files=[capture_file])
    tls = TLSModule(module=MODULE)
    gen_html = tls.generate_outbound_connection_table(ip_dst)
    print(gen_html)

  def tls_module_report_multi_page_test(self):
    print('\ntls_module_report_test')
    os.environ['DEVICE_MAC'] = '68:5e:1c:cb:6e:cb'
    startup_pcap_file = os.path.join(CAPTURES_DIR, 'multi_page_startup.pcap')
    monitor_pcap_file = os.path.join(CAPTURES_DIR, 'multi_page_monitor.pcap')
    tls_pcap_file = os.path.join(CAPTURES_DIR, 'multi_page_tls.pcap')
    tls = TLSModule(module=MODULE,
                    results_dir=OUTPUT_DIR,
                    startup_capture_file=startup_pcap_file,
                    monitor_capture_file=monitor_pcap_file,
                    tls_capture_file=tls_pcap_file)
    conns_orig = TLS_UTIL.get_all_outbound_connections(
        device_mac='68:5e:1c:cb:6e:cb', capture_files=[monitor_pcap_file]) * 5
    conns_mock = unittest.mock.MagicMock()
    conns_mock.get_all_outbound_connections.return_value = conns_orig
    tls._tls_util = conns_mock # pylint: disable=W0212
    report_out_path = tls.generate_module_report()
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()
    # Read the local good report
    with open(LOCAL_REPORT, 'r', encoding='utf-8') as file:
      report_local = file.read()

    self.assertEqual(report_out, report_local)

  def tls_module_report_test(self):
    print('\ntls_module_report_test')
    os.environ['DEVICE_MAC'] = '38:d1:35:01:17:fe'
    pcap_file = os.path.join(CAPTURES_DIR, 'tls.pcap')
    tls = TLSModule(module=MODULE,
                    results_dir=OUTPUT_DIR,
                    startup_capture_file=pcap_file,
                    monitor_capture_file=pcap_file,
                    tls_capture_file=pcap_file)
    report_out_path = tls.generate_module_report()
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT_SINGLE, 'r', encoding='utf-8') as file:
      report_local = file.read()
    self.assertEqual(report_out, report_local)

  def tls_module_report_ext_test(self):
    print('\ntls_module_report_ext_test')
    os.environ['DEVICE_MAC'] = '28:29:86:27:d6:05'
    pcap_file = os.path.join(CAPTURES_DIR, 'tls_ext.pcap')
    tls = TLSModule(module=MODULE,
                    results_dir=OUTPUT_DIR,
                    startup_capture_file=pcap_file,
                    monitor_capture_file=pcap_file,
                    tls_capture_file=pcap_file)
    report_out_path = tls.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT_EXT, 'r', encoding='utf-8') as file:
      report_local = file.read()

    # Copy the generated html report to a new file
    new_report_name = 'tls_report_ext_local.html'
    new_report_path = os.path.join(OUTPUT_DIR, new_report_name)
    shutil.copy(report_out_path, new_report_path)

    self.assertEqual(report_out, report_local)

  def tls_module_report_no_cert_test(self):
    print('\ntls_module_report_no_cert_test')
    os.environ['DEVICE_MAC'] = ''
    pcap_file = os.path.join(CAPTURES_DIR, 'tls_ext.pcap')
    tls = TLSModule(module=MODULE,
                    results_dir=OUTPUT_DIR,
                    startup_capture_file=pcap_file,
                    monitor_capture_file=pcap_file,
                    tls_capture_file=pcap_file)

    report_out_path = tls.generate_module_report()

    # Read the generated report
    with open(report_out_path, 'r', encoding='utf-8') as file:
      report_out = file.read()

    # Read the local good report
    with open(LOCAL_REPORT_NO_CERT, 'r', encoding='utf-8') as file:
      report_local = file.read()

    # Copy the generated html report to a new file
    new_report_name = 'tls_report_no_cert_local.html'
    new_report_path = os.path.join(OUTPUT_DIR, new_report_name)
    shutil.copy(report_out_path, new_report_path)

    self.assertEqual(report_out, report_local)

  def generate_tls_traffic(self,
                           capture_file,
                           tls_version,
                           disable_valid_ciphers=False):
    capture_thread = self.start_capture_thread(10)
    print('Capture Started')

    # Generate some TLS 1.2 outbound traffic
    while capture_thread.is_alive():
      self.make_tls_connection('www.google.com', 443, tls_version,
                               disable_valid_ciphers)
      time.sleep(1)

    # Save the captured packets to the file.
    wrpcap(capture_file, PACKET_CAPTURE)

  def make_tls_connection(self,
                          hostname,
                          port,
                          tls_version,
                          disable_valid_ciphers=False):
    try:
      # Create the SSL context with the desired TLS version and options
      context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
      context.check_hostname = False
      context.verify_mode = ssl.CERT_NONE

      if disable_valid_ciphers:
        # Create a list of ciphers that do not use ECDH or ECDSA
        ciphers_str = [
            'TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256',
            'TLS_AES_128_GCM_SHA256', 'AES256-GCM-SHA384',
            'PSK-AES256-GCM-SHA384', 'PSK-CHACHA20-POLY1305',
            'RSA-PSK-AES128-GCM-SHA256', 'DHE-PSK-AES128-GCM-SHA256',
            'AES128-GCM-SHA256', 'PSK-AES128-GCM-SHA256', 'AES256-SHA256',
            'AES128-SHA'
        ]
        context.set_ciphers(':'.join(ciphers_str))

      # Disable specific TLS versions based on the input
      if tls_version != '1.1':
        context.options |= ssl.OP_NO_TLSv1  # Disable TLS 1.0
        context.options |= ssl.OP_NO_TLSv1_1  # Disable TLS 1.1
      else:
        context.options |= ssl.OP_NO_TLSv1_2  # Disable TLS 1.2
        context.options |= ssl.OP_NO_TLSv1_3  # Disable TLS 1.3

      if tls_version == '1.3':
        context.options |= ssl.OP_NO_TLSv1_2  # Disable TLS 1.2
      elif tls_version == '1.2':
        context.options |= ssl.OP_NO_TLSv1_3  # Disable TLS 1.3

      # Create an SSL/TLS socket
      with socket.create_connection((hostname, port), timeout=10) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as secure_sock:
          # Get the server's certificate in PEM format
          ssl.DER_cert_to_PEM_cert(secure_sock.getpeercert(True))

    except ConnectionRefusedError:
      print(f'Connection to {hostname}:{port} was refused.')
    except socket.gaierror:
      print(f'Failed to resolve the hostname {hostname}.')
    except ssl.SSLError as e:
      print(f'SSL error occurred: {e}')
    except socket.timeout:
      print('Socket timeout error')

  def start_capture(self, timeout):
    global PACKET_CAPTURE
    PACKET_CAPTURE = sniff(iface=INTERNET_IFACE, timeout=timeout)

  def start_capture_thread(self, timeout):
    # Start the packet capture in a separate thread to avoid blocking.
    capture_thread = threading.Thread(target=self.start_capture,
                                      args=(timeout, ))
    capture_thread.start()

    return capture_thread

  def get_interface_mac(self, interface_name):
    try:
      addresses = netifaces.ifaddresses(interface_name)
      mac = addresses[netifaces.AF_LINK][0]['addr']
      return mac
    except (ValueError, KeyError) as e:
      print(f'Error: {e}')
      return None

  def tls_module_trusted_ca_cert_chain_test(self):
    print('\ntls_module_trusted_ca_cert_chain_test')
    self.download_public_cert('google.com')
    cert_path = os.path.join(CERT_DIR, '_.google.com.crt')
    cert_valid = TLS_UTIL.validate_cert_chain(device_cert_path=cert_path)
    self.assertEqual(cert_valid, True)

  def tls_module_local_ca_cert_test(self):
    print('\ntls_module_trusted_ca_cert_chain_test')
    cert_path = os.path.join(CERT_DIR, 'device_cert_local.crt')
    cert_valid = TLS_UTIL.validate_local_ca_signature(
        device_cert_path=cert_path)
    self.assertEqual(cert_valid[0], True)

  def tls_module_ca_cert_spaces_test(self):
    print('\ntls_module_ca_cert_spaces_test')
    # Make a tmp folder to make a differnt CA directory
    tmp_dir = os.path.join(TEST_FILES_DIR, 'tmp')
    if os.path.exists(tmp_dir):
      shutil.rmtree(tmp_dir)
    os.makedirs(tmp_dir, exist_ok=True)
    # Move and rename the TestRun CA root with spaces
    ca_file = os.path.join(ROOT_CERTS_DIR, 'Testrun_CA_Root.crt')
    ca_file_with_spaces = os.path.join(tmp_dir, 'Testrun CA Root.crt')
    shutil.copy(ca_file, ca_file_with_spaces)

    cert_path = os.path.join(CERT_DIR, 'device_cert_local.crt')
    log = logger.get_logger('unit_test_' + MODULE)
    log.setLevel(logging.DEBUG)
    tls_util = TLSUtil(log, cert_out_dir=OUTPUT_DIR, root_certs_dir=tmp_dir)

    cert_valid = tls_util.validate_local_ca_signature(
        device_cert_path=cert_path)
    self.assertEqual(cert_valid[0], True)

  def download_public_cert(self, hostname, port=443):
    # Set up an SSL context to connect securely
    context = ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2

    # Establish a connection to the server
    with socket.create_connection((hostname, port)) as sock:
      with context.wrap_socket(sock, server_hostname=hostname) as ssock:
        # Get the server certificate in DER format
        der_cert = ssock.getpeercert(binary_form=True)

    # Load the certificate using cryptography's x509 module
    cert = x509.load_der_x509_certificate(der_cert, backend=default_backend())

    # Convert the certificate to PEM format
    pem_cert = cert.public_bytes(encoding=serialization.Encoding.PEM)

    # Write the PEM certificate to a file
    cert_path = os.path.join(CERT_DIR, '_.google.com.crt')
    with open(cert_path, 'w', encoding='utf-8') as cert_file:
      cert_file.write(pem_cert.decode())


if __name__ == '__main__':
  suite = unittest.TestSuite()
  suite.addTest(TLSModuleTest('client_hello_packets_test'))

  # TLS 1.2 server tests
  suite.addTest(TLSModuleTest('security_tls_v1_2_server_no_ip_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_server_no_scan_results_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_server_scan_failure_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_server_no_tls_v1_2_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_server_no_tls_v1_3_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_server_v1_2_v1_3_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_multiple_https_servers_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_server_http_test'))
  suite.addTest(
    TLSModuleTest('security_tls_v1_2_server_compliant_invalid_v1_2_cert_test')
  )
  suite.addTest(
    TLSModuleTest(
      'security_tls_v1_2_server_non_compliant_invalid_1_2_and_1_3_cert_test'
    )
  )
  suite.addTest(TLSModuleTest('security_tls_v1_2_for_1_3_server_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_for_1_2_and_1_3_server_test'))
  suite.addTest(
      TLSModuleTest('security_tls_v1_2_for_1_2_and_1_3_fail_server_test'))
  suite.addTest(
      TLSModuleTest('security_tls_v1_2_for_1_3_and_1_2_fail_server_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_fail_server_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_none_server_test'))

  # TLS 1.3 server tests
  suite.addTest(TLSModuleTest('security_tls_v1_3_server_test'))

  # TLS client tests
  suite.addTest(TLSModuleTest('security_tls_v1_2_client_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_3_client_test'))
  suite.addTest(TLSModuleTest('security_tls_client_skip_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_client_cipher_fail_test'))
  suite.addTest(TLSModuleTest('test_client_tls_with_non_tls_client'))
  suite.addTest(TLSModuleTest('security_tls_client_unsupported_tls_client'))

  # Test the results options for tls server tests
  suite.addTest(TLSModuleTest('security_tls_server_results_test'))

  # Test various report module outputs
  suite.addTest(TLSModuleTest('tls_module_report_test'))
  suite.addTest(TLSModuleTest('tls_module_report_ext_test'))
  suite.addTest(TLSModuleTest('tls_module_report_no_cert_test'))
  suite.addTest(TLSModuleTest('tls_module_report_multi_page_test'))

  # Test signature validation methods
  suite.addTest(TLSModuleTest('tls_module_trusted_ca_cert_chain_test'))
  suite.addTest(TLSModuleTest('tls_module_local_ca_cert_test'))
  suite.addTest(TLSModuleTest('tls_module_ca_cert_spaces_test'))

  suite.addTest(TLSModuleTest('security_tls_client_allowed_protocols_test'))

  suite.addTest(TLSModuleTest('outbound_connections_test'))
  suite.addTest(TLSModuleTest('outbound_connections_report_test'))

  runner = unittest.TextTestRunner()
  test_result = runner.run(suite)

  # Check if the tests failed and exit with the appropriate code
  if not test_result.wasSuccessful():
    sys.exit(1)  # Return a non-zero exit code for failures
  sys.exit(0)  # Return zero for success
