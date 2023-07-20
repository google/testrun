from tls_util import TLSUtil
import unittest
import common.logger as logger
from scapy.all import sniff, wrpcap
import os
import threading
import time
import requests
import netifaces
import ssl
import http.client

CAPTURE_DIR = 'testing/unit_test/temp'
MODULE_NAME = 'security_module_test'
TLS_UTIL = None
PACKET_CAPTURE = None


class SecurityModuleTest(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    log = logger.get_logger(MODULE_NAME)
    global TLS_UTIL
    TLS_UTIL = TLSUtil(log,bin_dir="modules/test/security/bin")

  def security_tls_v1_2_server_test(self):
    test_results = TLS_UTIL.validate_tls_server('google.com', tls_version='1.2')
    self.assertTrue(test_results[0])

  def security_tls_v1_3_server_test(self):
    test_results = TLS_UTIL.validate_tls_server('google.com', tls_version='1.3')
    self.assertTrue(test_results[0])

  def security_tls_v1_2_client_test(self):
    test_results = self.test_client_tls('1.2')
    self.assertTrue(test_results[0])

  def security_tls_v1_3_client_test(self):
    test_results = self.test_client_tls('1.3')
    self.assertTrue(test_results[0])

  def test_client_tls(self,tls_version):
    # Make the capture file
    os.makedirs(CAPTURE_DIR, exist_ok=True)
    capture_file = CAPTURE_DIR + '/client_tls.pcap'

    # Resolve the client ip used
    client_ip = self.get_interface_ip('eth0')

    # Genrate TLS outbound traffic
    self.generate_tls_traffic(capture_file, tls_version)

    # Run the client test
    return TLS_UTIL.validate_tls_client(client_ip=client_ip,tls_version=tls_version,capture_file=capture_file)
    

  def generate_tls_traffic(self, capture_file, tls_version):
    capture_thread = self.start_capture_thread(capture_file,10)
    print('Capture Started')

    # Generate some TLS 1.2 outbound traffic
    while(capture_thread.is_alive()):
      self.make_tls_connection("www.google.com",443,tls_version)
      time.sleep(1)

    # Save the captured packets to the file.
    wrpcap(capture_file, PACKET_CAPTURE)

  def make_tls_connection(self, hostname, port, tls_version):
    # Create the SSL context with the desired TLS version and options
    context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    context.options |= ssl.PROTOCOL_TLS
    context.options |= ssl.OP_NO_TLSv1  # Disable TLS 1.0
    context.options |= ssl.OP_NO_TLSv1_1  # Disable TLS 1.1

    if tls_version == '1.3':
        context.options |= ssl.OP_NO_TLSv1_2  # Disable TLS 1.2
    elif tls_version == '1.2':
        context.options |= ssl.OP_NO_TLSv1_3  # Disable TLS 1.3

    # Create the HTTPS connection with the SSL context
    connection = http.client.HTTPSConnection(hostname, port, context=context)

    # Perform the TLS handshake manually
    connection.connect()

    # At this point, the TLS handshake is complete.
    # You can do any further processing or just close the connection.
    connection.close()

  def start_capture(self,timeout):
    global PACKET_CAPTURE
    PACKET_CAPTURE = sniff(iface='eth0', timeout=timeout)

  def start_capture_thread(self, capture_file,timeout):
    # Start the packet capture in a separate thread to avoid blocking.
    capture_thread = threading.Thread(target=self.start_capture, args=(timeout,))
    capture_thread.start()

    return capture_thread

  def get_interface_ip(self,interface_name):
    try:
        addresses = netifaces.ifaddresses(interface_name)
        ipv4 = addresses[netifaces.AF_INET][0]['addr']
        return ipv4
    except (ValueError, KeyError) as e:
        print(f"Error: {e}")
        return None

if __name__ == '__main__':
  suite = unittest.TestSuite()
  suite.addTest(SecurityModuleTest('security_tls_v1_2_server_test'))
  suite.addTest(SecurityModuleTest('security_tls_v1_3_server_test'))
  suite.addTest(SecurityModuleTest('security_tls_v1_2_client_test'))
  suite.addTest(SecurityModuleTest('security_tls_v1_3_client_test'))
  runner = unittest.TextTestRunner()
  runner.run(suite)
