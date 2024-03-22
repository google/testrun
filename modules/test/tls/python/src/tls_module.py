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
"""Baseline test module"""
from test_module import TestModule
from tls_util import TLSUtil
import os
import pyshark
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, dsa, ec

LOG_NAME = 'test_tls'
MODULE_REPORT_FILE_NAME = 'tls_report.md'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
TLS_CAPTURE_FILE = '/runtime/output/tls.pcap'

LOGGER = None


class TLSModule(TestModule):
  """An example testing module."""

  def __init__(self,
               module,
               log_dir=None,
               conf_file=None,
               results_dir=None,
               startup_capture_file=STARTUP_CAPTURE_FILE,
               monitor_capture_file=MONITOR_CAPTURE_FILE,
               tls_capture_file=TLS_CAPTURE_FILE):
    super().__init__(module_name=module,
                     log_name=LOG_NAME,
                     log_dir=log_dir,
                     conf_file=conf_file,
                     results_dir=results_dir)
    self.startup_capture_file = startup_capture_file
    self.monitor_capture_file = monitor_capture_file
    self.tls_capture_file = tls_capture_file
    global LOGGER
    LOGGER = self._get_logger()
    self._tls_util = TLSUtil(LOGGER)

  def generate_module_report(self):
    summary = '## Summary'

    summary_header = (f'''| {'#': ^5} '''
              f'''| {'Expiry': ^{25}} '''
              f'''| {'Length': ^{8}} '''
              f'''| {'Type': ^{6}} '''
              f'''| {'Port No.': ^{10}} '''
              f'''| {'Signed by': ^{11}} | ''')
    summary_header_line = (f'''|{'-' * 7}'''
                           f'''|{'-' * 27}'''
                           f'''|{'-' * 10}'''
                           f'''|{'-' * 8}'''
                           f'''|{'-' * 12}'''
                           f'''|{'-' * 13}|''')
    summary_table = f'{summary_header}\n{summary_header_line}'

    # List of capture files to scan
    pcap_files = [
        self.startup_capture_file, self.monitor_capture_file,
        self.tls_capture_file
    ]
    certificates = self.extract_certificates_from_pcap(pcap_files,
                                                       self._device_mac)
    if len(certificates)>0:
      cert_tables = []
      for cert_num, ((ip_address, port), cert) in enumerate(certificates.items()):
        # Extract certificate data
        not_valid_before = cert.not_valid_before
        not_valid_after = cert.not_valid_after
        version_value = f'{cert.version.value + 1} ({hex(cert.version.value)})'
        signature_alg_value = cert.signature_algorithm_oid._name  # pylint: disable=W0212
        not_before = str(not_valid_before)
        not_after = str(not_valid_after)
        public_key = cert.public_key()
        signed_by = 'None'
        if isinstance(public_key, rsa.RSAPublicKey):
            public_key_type = "RSA"
        elif isinstance(public_key, dsa.DSAPublicKey):
            public_key_type = "DSA"
        elif isinstance(public_key, ec.EllipticCurvePublicKey):
            public_key_type = "EC"
        else:
            public_key_type = "Unknown"
        # Calculate certificate length
        cert_length = len(cert.public_bytes(encoding=serialization.Encoding.DER))
        # Generate the Certificate table
        cert_table = (f'| Property | Value |\n'
                      f'|---|---|\n'
                      f"| {'Version':<17} | {version_value:^25} |\n"
                      f"| {'Signature Alg.':<17} | {signature_alg_value:^25} |\n"
                      f"| {'Validity from':<17} | {not_before:^25} |\n"
                      f"| {'Valid to':<17} | {not_after:^25} |")

        # Generate the Subject table
        subj_table = ('| Distinguished Name | Value |\n'
                      '|---|---|')
        for val in cert.subject.rdns:
          dn = val.rfc4514_string().split('=')
          subj_table += f'\n| {dn[0]} | {dn[1]}'

        # Generate the Issuer table
        iss_table = ('| Distinguished Name | Value |\n'
                     '|---|---|')
        for val in cert.issuer.rdns:
          dn = val.rfc4514_string().split('=')
          iss_table += f'\n| {dn[0]} | {dn[1]}'
          if 'CN' in dn[0]:
            signed_by = dn[1]

        ext_table = None
        if cert.extensions:
          ext_table = ('| Extension | Value |\n'
                       '|---|---|')
          for extension in cert.extensions:
            for extension_value in extension.value:
              ext_table += f'\n| {extension.oid._name} | {extension_value.value}'  # pylint: disable=W0212
        cert_table = f'### Certificate\n{cert_table}'
        cert_table += f'\n\n### Subject\n{subj_table}'
        cert_table += f'\n\n### Issuer\n{iss_table}'
        if ext_table is not None:
          cert_table += f'\n\n### Extensions\n{ext_table}'
        cert_tables.append(cert_table)
        summary_table_row = (f'''| {cert_num+1: ^5} '''
                             f'''| {not_after: ^25} '''
                             f'''| {cert_length: ^8} '''
                             f'''| {public_key_type: ^6} '''
                             f'''| {port: ^10} '''
                             f'''| {signed_by: ^11} |''')
        summary_table+=f'\n{summary_table_row}'

      markdown_template = '# TLS Module\n' + '\n'.join(
          '\n' + tables for tables in cert_tables)

      # summary = f'## Summary\n\n{summary_table}'
      # markdown_template += f'\n\n{summary}'
    else:
      markdown_template = (f'''# TLS Module\n'''
        f'''\n- No device certificates detected\n''')
      
    summary = f'## Summary\n\n{summary_table}'
    markdown_template += f'\n\n{summary}'
    LOGGER.debug('Markdown Report:\n' + markdown_template)

    # Use os.path.join to create the complete file path
    report_path = os.path.join(self._results_dir, MODULE_REPORT_FILE_NAME)

    # Write the content to a file
    with open(report_path, 'w', encoding='utf-8') as file:
      file.write(markdown_template)

    LOGGER.info('Module report generated at: ' + str(report_path))
    return report_path

  def extract_certificates_from_pcap(self, pcap_files, mac_address):
    # Initialize a list to store packets
    all_packets = []
    # Iterate over each file
    for pcap_file in pcap_files:
      # Open the capture file
      packets = pyshark.FileCapture(pcap_file)
      try:
        # Iterate over each packet in the file and add it to the list
        for packet in packets:
          all_packets.append(packet)
      finally:
        # Close the capture file
        packets.close()

    certificates = {}
    # Loop through each item (packet)
    for packet in all_packets:
      if 'TLS' in packet:
        # Check if the packet's source matches the target MAC address
        if 'eth' in packet and (packet.eth.src == mac_address):
          # Look for attribute of x509
          if hasattr(packet['TLS'], 'x509sat_utf8string'):
            certificate_bytes = bytes.fromhex(
                packet['TLS'].handshake_certificate.replace(':', ''))
            # Parse the certificate bytes
            certificate = x509.load_der_x509_certificate(
                certificate_bytes, default_backend())
            # Extract IP address and port from packet
            ip_address = packet.ip.src
            port = packet.tcp.srcport if 'tcp' in packet else packet.udp.srcport
            # Store certificate in dictionary with IP address and port as key
            certificates[(ip_address, port)] = certificate
    return certificates

  def _security_tls_v1_2_server(self):
    LOGGER.info('Running security.tls.v1_2_server')
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      tls_1_2_results = self._tls_util.validate_tls_server(
          self._device_ipv4_addr, tls_version='1.2')
      tls_1_3_results = self._tls_util.validate_tls_server(
          self._device_ipv4_addr, tls_version='1.3')
      return self._tls_util.process_tls_server_results(tls_1_2_results,
                                                       tls_1_3_results)
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')
      return None, 'Could not resolve device IP address'

  def _security_tls_v1_3_server(self):
    LOGGER.info('Running security.tls.v1_3_server')
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      return self._tls_util.validate_tls_server(self._device_ipv4_addr,
                                                tls_version='1.3')
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')
      return None, 'Could not resolve device IP address'

  def _security_tls_v1_2_client(self):
    LOGGER.info('Running security.tls.v1_2_client')
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      return self._validate_tls_client(self._device_ipv4_addr, '1.2')
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')
      return None, 'Could not resolve device IP address'

  def _security_tls_v1_3_client(self):
    LOGGER.info('Running security.tls.v1_3_client')
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      return self._validate_tls_client(self._device_ipv4_addr, '1.3')
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')
      return None, 'Could not resolve device IP address'

  def _validate_tls_client(self, client_ip, tls_version):
    client_results = self._tls_util.validate_tls_client(
        client_ip=client_ip,
        tls_version=tls_version,
        capture_files=[
            MONITOR_CAPTURE_FILE, STARTUP_CAPTURE_FILE, TLS_CAPTURE_FILE
        ])

    # Generate results based on the state
    result_message = 'No outbound connections were found.'
    result_state = None

    # If any of the packetes detect failed client comms, fail the test
    if not client_results[0] and client_results[0] is not None:
      result_state = False
      result_message = client_results[1]
    else:
      if client_results[0]:
        result_state = True
        result_message = client_results[1]
    return result_state, result_message

  def _resolve_device_ip(self):
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4()
