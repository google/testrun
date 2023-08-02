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
from tls_util import TLSUtil
import unittest
from common import logger
from scapy.all import sniff, wrpcap
import os
import threading
import time
import netifaces
import ssl
import http.client

CAPTURE_DIR = 'testing/unit_test/temp'
MODULE_NAME = 'tls_module_test'
TLS_UTIL = None
PACKET_CAPTURE = None


class TLSModuleTest(unittest.TestCase):
  """Contains and runs all the unit tests concerning TLS behaviors"""
  @classmethod
  def setUpClass(cls):
    log = logger.get_logger(MODULE_NAME)
    global TLS_UTIL
    TLS_UTIL = TLSUtil(log,
                       bin_dir='modules/test/tls/bin',
                       cert_out_dir='testing/unit_test/temp',
                       root_certs_dir='local/root_certs')

  # Test 1.2 server when only 1.2 connection is established
  def security_tls_v1_2_server_test(self):
    tls_1_2_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.2')
    tls_1_3_results = None, 'No TLS 1.3'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.3 connection is established
  def security_tls_v1_2_for_1_3_server_test(self):
    tls_1_2_results = None, 'No TLS 1.2'
    tls_1_3_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.3')
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.2 and 1.3 connection is established
  def security_tls_v1_2_for_1_2_and_1_3_server_test(self):
    tls_1_2_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.2')
    tls_1_3_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.3')
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.2 and failed 1.3 connection is established
  def security_tls_v1_2_for_1_2_and_1_3_fail_server_test(self):
    tls_1_2_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.2')
    tls_1_3_results = False, 'Signature faild'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.3 and failed 1.2 connection is established
  def security_tls_v1_2_for_1_3_and_1_2_fail_server_test(self):
    tls_1_3_results = TLS_UTIL.validate_tls_server('google.com',
                                                   tls_version='1.3')
    tls_1_2_results = False, 'Signature faild'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results)
    self.assertTrue(test_results[0])

  # Test 1.2 server when 1.3 and 1.2 failed connection is established
  def security_tls_v1_2_fail_server_test(self):
    tls_1_2_results = False, 'Signature faild'
    tls_1_3_results = False, 'Signature faild'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results)
    self.assertFalse(test_results[0])

    # Test 1.2 server when 1.3 and 1.2 failed connection is established
  def security_tls_v1_2_none_server_test(self):
    tls_1_2_results = None, 'No cert'
    tls_1_3_results = None, 'No cert'
    test_results = TLS_UTIL.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results)
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

  def security_tls_client_skip_test(self):
    # 1.1 will fail to connect and so no hello client will exist
    # which should result in a skip result
    test_results = self.test_client_tls('1.2', tls_generate='1.1')
    print(str(test_results))
    self.assertIsNone(test_results[0])

  def security_tls_v1_3_client_test(self):
    test_results = self.test_client_tls('1.3')
    print(str(test_results))
    self.assertTrue(test_results[0])

  def client_hello_packets_test(self):
    packet_fail = {'dst_ip': '10.10.10.1', 'src_ip': '10.10.10.14', 'dst_port': '443', 'cipher_support': {'ecdh': False, 'ecdsa': True}}
    packet_success = {'dst_ip': '10.10.10.1', 'src_ip': '10.10.10.14', 'dst_port': '443', 'cipher_support': {'ecdh': True, 'ecdsa': True}}
    hello_packets = [packet_fail,packet_success]
    hello_results = TLS_UTIL.process_hello_packets(hello_packets,'1.2')
    print("Hello packets test results: " + str(hello_results))
    expected = {'valid':[packet_success],'invalid':[]}
    self.assertEqual(hello_results,expected)

  def test_client_tls(self,
                      tls_version,
                      tls_generate=None,
                      disable_valid_ciphers=False):
    # Make the capture file
    os.makedirs(CAPTURE_DIR, exist_ok=True)
    capture_file = CAPTURE_DIR + '/client_tls.pcap'

    # Resolve the client ip used
    client_ip = self.get_interface_ip('eth0')

    # Genrate TLS outbound traffic
    if tls_generate is None:
      tls_generate = tls_version
    self.generate_tls_traffic(capture_file, tls_generate, disable_valid_ciphers)

    # Run the client test
    return TLS_UTIL.validate_tls_client(client_ip=client_ip,
                                        tls_version=tls_version,
                                        capture_file=capture_file)

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
    # Create the SSL context with the desired TLS version and options
    context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    context.options |= ssl.PROTOCOL_TLS

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

    # Create the HTTPS connection with the SSL context
    connection = http.client.HTTPSConnection(hostname, port, context=context)

    # Perform the TLS handshake manually
    try:
      connection.connect()
    except ssl.SSLError as e:
      print('Failed to make connection: ' + str(e))

    # At this point, the TLS handshake is complete.
    # You can do any further processing or just close the connection.
    connection.close()

  def start_capture(self, timeout):
    global PACKET_CAPTURE
    PACKET_CAPTURE = sniff(iface='eth0', timeout=timeout)

  def start_capture_thread(self, timeout):
    # Start the packet capture in a separate thread to avoid blocking.
    capture_thread = threading.Thread(target=self.start_capture,
                                      args=(timeout, ))
    capture_thread.start()

    return capture_thread

  def get_interface_ip(self, interface_name):
    try:
      addresses = netifaces.ifaddresses(interface_name)
      ipv4 = addresses[netifaces.AF_INET][0]['addr']
      return ipv4
    except (ValueError, KeyError) as e:
      print(f'Error: {e}')
      return None


if __name__ == '__main__':
  suite = unittest.TestSuite()
  suite.addTest(TLSModuleTest('client_hello_packets_test'))
  # TLS 1.2 server tests
  suite.addTest(TLSModuleTest('security_tls_v1_2_server_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_for_1_3_server_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_for_1_2_and_1_3_server_test'))
  suite.addTest(
      TLSModuleTest('security_tls_v1_2_for_1_2_and_1_3_fail_server_test'))
  suite.addTest(
      TLSModuleTest('security_tls_v1_2_for_1_3_and_1_2_fail_server_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_fail_server_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_none_server_test'))
  # # TLS 1.3 server tests
  suite.addTest(TLSModuleTest('security_tls_v1_3_server_test'))
  # TLS client tests
  suite.addTest(TLSModuleTest('security_tls_v1_2_client_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_3_client_test'))
  suite.addTest(TLSModuleTest('security_tls_client_skip_test'))
  suite.addTest(TLSModuleTest('security_tls_v1_2_client_cipher_fail_test'))
  runner = unittest.TextTestRunner()
  runner.run(suite)
