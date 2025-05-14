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
"""TLS test module"""
# pylint: disable=W0212

from test_module import TestModule
from tls_util import TLSUtil
from http_scan import HTTPScan
import os
import pyshark
from binascii import hexlify
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, dsa, ec
from cryptography.x509 import AuthorityKeyIdentifier, SubjectKeyIdentifier, BasicConstraints, KeyUsage
from cryptography.x509 import GeneralNames, DNSName, ExtendedKeyUsage, ObjectIdentifier, SubjectAlternativeName
from jinja2 import Environment, FileSystemLoader

LOG_NAME = 'test_tls'
MODULE_REPORT_FILE_NAME = 'tls_report.j2.html'
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
TLS_CAPTURE_FILE = '/runtime/output/tls.pcap'
GATEWAY_CAPTURE_FILE = '/runtime/network/gateway.pcap'
LOGGER = None
REPORT_TEMPLATE_FILE = 'report_template.jinja2'
OUTBOUND_CONNS_PER_PAGE = 18


class TLSModule(TestModule):
  """The TLS testing module."""

  def __init__(self, # pylint: disable=R0917
               module,
               conf_file=None,
               results_dir=None,
               startup_capture_file=STARTUP_CAPTURE_FILE,
               monitor_capture_file=MONITOR_CAPTURE_FILE,
               tls_capture_file=TLS_CAPTURE_FILE):
    super().__init__(module_name=module,
                     log_name=LOG_NAME,
                     conf_file=conf_file,
                     results_dir=results_dir)
    self.startup_capture_file = startup_capture_file
    self.monitor_capture_file = monitor_capture_file
    self.tls_capture_file = tls_capture_file
    global LOGGER
    LOGGER = self._get_logger()
    self._tls_util = TLSUtil(LOGGER)
    self._http_scan = HTTPScan(LOGGER)
    self._scan_results = None

  def generate_module_report(self):
    # Load Jinja2 template
    loader=FileSystemLoader(self._report_template_folder)
    template = Environment(
                          loader=loader,
                          trim_blocks=True,
                          lstrip_blocks=True
                          ).get_template(REPORT_TEMPLATE_FILE)
    module_header='TLS Module'
    # Summary table headers
    summary_headers = [
                        'Expiry',
                        'Length',
                        'Type',
                        'Port number',
                        'Signed by',
                        ]
    # Cert table headers
    cert_table_headers = ['Property', 'Value']
    # Outbound connections table headers
    outbound_headers = ['Destination IP', 'Port']
    pages = {}
    outbound_conns = None

    # List of capture files to scan
    pcap_files = [
        self.startup_capture_file, self.monitor_capture_file,
        self.tls_capture_file
    ]
    certificates = self.extract_certificates_from_pcap(pcap_files,
                                                       self._device_mac)
    if len(certificates) > 0:

      # pylint: disable=W0612
      for cert_num, ((ip_address, port),
                     cert) in enumerate(certificates.items()):
        pages[cert_num] = {}

        # Extract certificate data
        not_valid_before = cert.not_valid_before
        not_valid_after = cert.not_valid_after
        version_value = f'{cert.version.value + 1} ({hex(cert.version.value)})'
        signature_alg_value = cert.signature_algorithm_oid._name
        not_before = str(not_valid_before)
        not_after = str(not_valid_after)
        public_key = cert.public_key()
        signed_by = 'None'

        if isinstance(public_key, rsa.RSAPublicKey):
          public_key_type = 'RSA'
        elif isinstance(public_key, dsa.DSAPublicKey):
          public_key_type = 'DSA'
        elif isinstance(public_key, ec.EllipticCurvePublicKey):
          public_key_type = 'EC'
        else:
          public_key_type = 'Unknown'

        # Calculate certificate length
        cert_length = len(
            cert.public_bytes(encoding=serialization.Encoding.DER))

        # Append certification information
        pages[cert_num]['cert_info_data'] = {
                            'Version': version_value,
                            'Signature Alg.': signature_alg_value,
                            'Validity from': not_before,
                            'Valid to': not_after,
                          }

        # Append the subject information
        pages[cert_num]['subject_data'] = {}
        for val in cert.subject.rdns:
          dn = val.rfc4514_string().split('=')
          pages[cert_num]['subject_data'][dn[0]] = dn[1]

        # Append issuer information
        for val in cert.issuer.rdns:
          dn = val.rfc4514_string().split('=')
          if 'CN' in dn[0]:
            signed_by = dn[1]

        # Append extensions information
        if cert.extensions:
          pages[cert_num]['cert_ext'] = {}
          for extension in cert.extensions:
            if isinstance(extension.value, list):
              for extension_value in extension.value:
                extension_name = extension.oid._name
                formatted_value = self.format_extension_value(
                  extension_value.value)
                pages[cert_num]['cert_ext'][extension_name] = formatted_value
            else:
              formatted_value = self.format_extension_value(
                  extension.value)
              pages[cert_num]['cert_ext'][extension.oid._name] = formatted_value

        pages[cert_num]['summary_data'] = [
                                            not_after,
                                            cert_length,
                                            public_key_type,
                                            port,
                                            signed_by
                                          ]

    report_jinja = ''
    if pages:
      for num,page in pages.items():
        module_header_repr = module_header if num == 0 else None
        cert_ext=page['cert_ext'] if 'cert_ext' in page else None
        page_html = template.render(
                                  base_template=self._base_template_file,
                                  module_header=module_header_repr,
                                  summary_headers=summary_headers,
                                  summary_data=page['summary_data'],
                                  cert_info_data=page['cert_info_data'],
                                  subject_data=page['subject_data'],
                                  cert_table_headers=cert_table_headers,
                                  cert_ext=cert_ext,
                                  ountbound_headers=outbound_headers,
                                )
        report_jinja += page_html

    else:
      report_jinja = template.render(
                                    base_template=self._base_template_file,
                                    module_header = module_header,
                                    )

    outbound_conns = self._tls_util.get_all_outbound_connections(
        device_mac=self._device_mac, capture_files=pcap_files)

    if outbound_conns:
      # Splitting Outbound Coonestions table to pages 
      pages = len(outbound_conns) // OUTBOUND_CONNS_PER_PAGE
      if pages * OUTBOUND_CONNS_PER_PAGE < len(outbound_conns):
        pages += 1
        for page in range(pages):
          start = page * OUTBOUND_CONNS_PER_PAGE
          end = min(page * OUTBOUND_CONNS_PER_PAGE + OUTBOUND_CONNS_PER_PAGE,
                    len(outbound_conns))
          outbound_conns_chunk = outbound_conns[start:end]
          out_page = template.render(
                              base_template=self._base_template_file,
                              ountbound_headers=outbound_headers,
                              outbound_conns=outbound_conns_chunk
                            )
          report_jinja += out_page

    LOGGER.debug('Module report:\n' + report_jinja)

    # Use os.path.join to create the complete file path
    jinja_path = os.path.join(self._results_dir, MODULE_REPORT_FILE_NAME)

    # Write the content to a file
    with open(jinja_path, 'w', encoding='utf-8') as file:
      file.write(report_jinja)

    LOGGER.info('Module report generated at: ' + str(jinja_path))
    return jinja_path

  def format_extension_value(self, value):
    if isinstance(value, bytes):
      # Convert byte sequences to hex strings
      return hexlify(value).decode()
    elif isinstance(value, (list, tuple)):
      # Format lists/tuples for HTML output
      return ', '.join([self.format_extension_value(v) for v in value])
    elif isinstance(value, ExtendedKeyUsage):
      # Handle ExtendedKeyUsage extension
      return ', '.join(
          [oid._name or f'Unknown OID ({oid.dotted_string})' for oid in value])
    elif isinstance(value, GeneralNames):
      # Handle GeneralNames (used in SubjectAlternativeName)
      return ', '.join(
          [name.value for name in value if isinstance(name, DNSName)])
    elif isinstance(value, SubjectAlternativeName):
      # Extract and format the GeneralNames (which contains DNSName,
      #IPAddress, etc.)
      return self.format_extension_value(value.get_values_for_type(DNSName))

    elif isinstance(value, ObjectIdentifier):
      # Handle ObjectIdentifier directly
      return value._name or f'Unknown OID ({value.dotted_string})'
    elif hasattr(value, '_name'):
      # Extract the name for OIDs (Object Identifiers)
      return value._name
    elif isinstance(value, AuthorityKeyIdentifier):
      # Handle AuthorityKeyIdentifier extension
      key_id = self.format_extension_value(value.key_identifier)
      cert_issuer = value.authority_cert_issuer
      cert_serial = value.authority_cert_serial_number

      return (f'key_identifier={key_id}, '
              f'authority_cert_issuer={cert_issuer}, '
              f'authority_cert_serial_number={cert_serial}')
    elif isinstance(value, SubjectKeyIdentifier):
      # Handle SubjectKeyIdentifier extension
      return f'digest={self.format_extension_value(value.digest)}'
    elif isinstance(value, BasicConstraints):
      # Handle BasicConstraints extension
      return f'ca={value.ca}, path_length={value.path_length}'
    elif isinstance(value, KeyUsage):
      # Handle KeyUsage extension
      return (f'digital_signature={value.digital_signature}, '
              f'key_cert_sign={value.key_cert_sign}, '
              f'key_encipherment={value.key_encipherment}, '
              f'crl_sign={value.crl_sign}')
    return str(value)  # Fallback to string conversion

  def generate_outbound_connection_table(self, outbound_conns):
    """Generate just an HTML table from a list of IPs"""
    html_content = '''
    <h1>Outbound Connections</h1>
    <table class="module-data">
      <thead>
          <tr>
              <th>Destination IP</th>
              <th>Port</th>
          </tr>
      </thead>
    <tbody>
    '''

    rows = [
        f'\t<tr><td>{ip}</td><td>{port}</td></tr>'
        for ip, port in outbound_conns
    ]
    html_content += '\n'.join(rows)

    # Close the table
    html_content += """
    </tbody>
    \r</table>
    """

    return html_content

  def extract_certificates_from_pcap(self, pcap_files, mac_address):
    # Initialize a list to store packets
    all_packets = []
    # Iterate over each file
    for pcap_file in pcap_files:
      # Open the capture file and filter by tls
      packets = pyshark.FileCapture(pcap_file, display_filter='tls')
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
    sorted_keys = sorted(certificates.keys(), key=lambda x: (x[0], x[1]))
    sorted_certificates = {k: certificates[k] for k in sorted_keys}
    return sorted_certificates

  def _security_tls_v1_2_server(self):
    LOGGER.info('Running security.tls.v1_2_server')
    # If the ipv4 address wasn't resolved yet, try again
    self._resolve_device_ip()
    ports_valid = []
    ports_invalid = []
    result = None
    details = ''
    description = ''
    if self._device_ipv4_addr is not None:
      if self._scan_results is None:
        self._scan_results = self._http_scan.scan_for_http_services(
            self._device_ipv4_addr)
      if self._scan_results is not None:
        for port, service_type in self._scan_results.items():
          if 'HTTPS' in service_type:
            LOGGER.info(f'Inspecting Service on port {port}: {service_type}')
            tls_1_2_results = self._tls_util.validate_tls_server(
                host=self._device_ipv4_addr, port=port, tls_version='1.2')
            tls_1_3_results = self._tls_util.validate_tls_server(
                host=self._device_ipv4_addr, port=port, tls_version='1.3')
            port_results = self._tls_util.process_tls_server_results(
                tls_1_2_results, tls_1_3_results, port=port)
            if port_results is not None:
              result = port_results[
                  0] if result is None else result and port_results[0]
              details += port_results[1]
              if port_results[0]:
                ports_valid.append(port)
              else:
                ports_invalid.append(port)
          elif 'HTTP' in service_type:
            # Any non-HTTPS service detetcted is automatically invalid
            ports_invalid.append(port)
            details += f'\nHTTP service detected on port {port}'
            result = False
        LOGGER.debug(f'Valid Ports: {ports_valid}')
        LOGGER.debug(f'Invalid Ports: {ports_invalid}')
      # Determine results and return proper messaging and details
      if result is None:
        result = 'Feature Not Detected'
        description = 'TLS 1.2 certificate could not be validated'
      elif result:
        ports_csv = ','.join(map(str,ports_valid))
        description = f'TLS 1.2 certificate valid on ports: {ports_csv}'
      else:
        ports_csv = ','.join(map(str,ports_invalid))
        description = f'TLS 1.2 certificate invalid on ports: {ports_csv}'
      return result, description, details
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')
      return 'Error', 'Could not resolve device IP address'

  def _security_tls_v1_3_server(self):
    LOGGER.info('Running security.tls.v1_3_server')
    # If the ipv4 address wasn't resolved yet, try again
    self._resolve_device_ip()
    ports_valid = []
    ports_invalid = []
    result = None
    details = ''
    description = ''
    if self._device_ipv4_addr is not None:
      if self._scan_results is None:
        self._scan_results = self._http_scan.scan_for_http_services(
            self._device_ipv4_addr)
      if self._scan_results is not None:
        for port, service_type in self._scan_results.items():
          if 'HTTPS' in service_type:
            LOGGER.info(f'Inspecting Service on port {port}: {service_type}')
            port_results = self._tls_util.validate_tls_server(
                self._device_ipv4_addr, tls_version='1.3', port=port)
            if port_results is not None:
              result = port_results[
                  0] if result is None else result and port_results[0]
              details += port_results[1]
              if port_results[0]:
                ports_valid.append(port)
              else:
                ports_invalid.append(port)
          elif 'HTTP' in service_type:
            # Any non-HTTPS service detetcted is automatically invalid
            ports_invalid.append(port)
            details += f'\nHTTP service detected on port {port}'
            result = False
        LOGGER.debug(f'Valid Ports: {ports_valid}')
        LOGGER.debug(f'Invalid Ports: {ports_invalid}')
      # Determine results and return proper messaging and details
      if result is None:
        result = 'Feature Not Detected'
        description = 'TLS 1.3 certificate could not be validated'
      elif result:
        ports_csv = ','.join(map(str,ports_valid))
        description = f'TLS 1.3 certificate valid on ports: {ports_csv}'
      else:
        ports_csv = ','.join(map(str,ports_invalid))
        description = f'TLS 1.3 certificate invalid on ports: {ports_csv}'
      return result, description, details
    else:
      LOGGER.error('Could not resolve device IP address')
      return 'Error', 'Could not resolve device IP address'

  def _security_tls_v1_0_client(self):
    LOGGER.info('Running security.tls.v1_0_client')
    tls_1_0_valid = self._validate_tls_client(self._device_mac, '1.0')
    tls_1_1_valid = self._validate_tls_client(self._device_mac, '1.1')
    tls_1_2_valid = self._validate_tls_client(self._device_mac, '1.2')
    tls_1_3_valid = self._validate_tls_client(self._device_mac, '1.3')
    states = [
        tls_1_0_valid[0], tls_1_1_valid[0], tls_1_2_valid[0], tls_1_3_valid[0]
    ]
    if any(state is True for state in states):
      # If any state is True, return True
      result_state = True
      result_message = 'TLS 1.0 or higher detected'
    elif all(state == 'Feature Not Detected' for state in states):
      # If all states are "Feature not Detected"
      result_state = 'Feature Not Detected'
      result_message = tls_1_0_valid[1]
    elif all(state == 'Error' for state in states):
      # If all states are "Error"
      result_state = 'Error'
      result_message = ''
    else:
      result_state = False
      result_message = 'TLS 1.0 or higher was not detected'
    result_details = tls_1_0_valid[2] + tls_1_1_valid[2] + tls_1_2_valid[
        2] + tls_1_3_valid[2]
    result_tags = list(
        set(tls_1_0_valid[3] + tls_1_1_valid[3] + tls_1_2_valid[3] +
            tls_1_3_valid[3]))
    return result_state, result_message, result_details, result_tags

  def _security_tls_v1_2_client(self):
    LOGGER.info('Running security.tls.v1_2_client')
    return self._validate_tls_client(self._device_mac,
                                     '1.2',
                                     unsupported_versions=['1.0', '1.1'])

  def _security_tls_v1_3_client(self):
    LOGGER.info('Running security.tls.v1_3_client')
    return self._validate_tls_client(self._device_mac,
                                     '1.3',
                                     unsupported_versions=['1.0', '1.1'])

  def _validate_tls_client(self,
                           client_mac,
                           tls_version,
                           unsupported_versions=None):
    client_results = self._tls_util.validate_tls_client(
        client_mac=client_mac,
        tls_version=tls_version,
        capture_files=[
            MONITOR_CAPTURE_FILE, STARTUP_CAPTURE_FILE, TLS_CAPTURE_FILE
        ],
        unsupported_versions=unsupported_versions)

    # Generate results based on the state
    result_state = None
    result_message = ''
    result_details = ''
    result_tags = []

    if client_results[0] is not None:
      result_details = client_results[1]
      if client_results[0]:
        result_state = True
        result_message = f'TLS {tls_version} client connections valid'
      else:
        result_state = False
        result_message = f'TLS {tls_version} client connections invalid'
    else:
      result_state = 'Feature Not Detected'
      result_message = 'No outbound TLS connections were found'
    return result_state, result_message, result_details, result_tags

  def _resolve_device_ip(self):
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None: # pylint: disable=E0203
      self._device_ipv4_addr = self._get_device_ipv4()
