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
"""Module that contains various metehods for validating TLS communications"""
import ssl
import socket
from datetime import datetime
from OpenSSL import crypto
import json
import os
from common import util
import ipaddress
import requests
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from ipaddress import IPv4Address

LOG_NAME = 'tls_util'
LOGGER = None
DEFAULT_BIN_DIR = '/testrun/bin'
DEFAULT_CERTS_OUT_DIR = '/runtime/output'
DEFAULT_ROOT_CERTS_DIR = '/testrun/root_certs'
# Define private IP subnets
PRIVATE_SUBNETS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16')
]


class TLSUtil():
  """Helper class for various tests concerning TLS communications"""

  def __init__(self,
               logger,
               bin_dir=DEFAULT_BIN_DIR,
               cert_out_dir=DEFAULT_CERTS_OUT_DIR,
               root_certs_dir=DEFAULT_ROOT_CERTS_DIR):
    global LOGGER
    LOGGER = logger
    self._bin_dir = bin_dir
    self._cert_out_dir = cert_out_dir
    self._dev_cert_file = 'device_cert.crt'
    self._root_certs_dir = root_certs_dir

  def get_public_certificate(self,
                             host,
                             port=443,
                             validate_cert=False,
                             tls_version='1.2'):
    try:
      #context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
      context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
      context.check_hostname = False
      if not validate_cert:
        # Disable certificate verification
        context.verify_mode = ssl.CERT_NONE
      else:
        # Use host CA certs for validation
        context.load_default_certs()
        context.verify_mode = ssl.CERT_REQUIRED

      # Set the correct TLS version
      context.options |= ssl.PROTOCOL_TLS
      context.options |= ssl.OP_NO_TLSv1  # Disable TLS 1.0
      context.options |= ssl.OP_NO_TLSv1_1  # Disable TLS 1.1
      if tls_version == '1.3':
        context.options |= ssl.OP_NO_TLSv1_2  # Disable TLS 1.2
      elif tls_version == '1.2':
        context.options |= ssl.OP_NO_TLSv1_3  # Disable TLS 1.3

      # Create an SSL/TLS socket
      with socket.create_connection((host, port), timeout=5) as sock:
        with context.wrap_socket(sock, server_hostname=host) as secure_sock:
          # Get the server's certificate in PEM format
          cert_pem = ssl.DER_cert_to_PEM_cert(secure_sock.getpeercert(True))

    except ConnectionRefusedError:
      LOGGER.info(f'Connection to {host}:{port} was refused.')
      return None
    except socket.gaierror:
      LOGGER.info(f'Failed to resolve the hostname {host}.')
      return None
    except ssl.SSLError as e:
      LOGGER.info(f'SSL error occurred: {e}')
      return None
    except socket.timeout:
      LOGGER.info('Socket timeout error')
      return None

    return cert_pem

  def get_public_key(self, public_cert):
    # Extract and return the public key from the certificate
    public_key = public_cert.get_pubkey()
    return public_key

  def verify_certificate_timerange(self, public_cert):
    # Extract the notBefore and notAfter dates from the certificate
    not_before = datetime.strptime(public_cert.get_notBefore().decode(),
                                   '%Y%m%d%H%M%SZ')
    not_after = datetime.strptime(public_cert.get_notAfter().decode(),
                                  '%Y%m%d%H%M%SZ')

    LOGGER.info('Certificate valid from: ' + str(not_before) + ' To ' +
                str(not_after))

    # Get the current date
    current_date = datetime.utcnow()

    # Check if today's date is within the certificate's validity range
    if not_before <= current_date <= not_after:
      return True, 'Certificate has a valid time range'
    elif current_date <= not_before:
      return False, 'Certificate is not yet valid'
    else:
      return False, 'Certificate has expired'

  def verify_public_key(self, public_key):

    # Get the key length based bits
    key_length = public_key.bits()
    LOGGER.info('Key Length: ' + str(key_length))

    # Check the key type
    key_type = 'Unknown'
    if public_key.type() == crypto.TYPE_RSA:
      key_type = 'RSA'
    elif public_key.type() == crypto.TYPE_EC:
      key_type = 'EC'
    elif public_key.type() == crypto.TYPE_DSA:
      key_type = 'DSA'
    elif public_key.type() == crypto.TYPE_DH:
      key_type = 'Diffie-Hellman'
    LOGGER.info('Key Type: ' + key_type)

    # Check if the public key is of RSA type
    if key_type == 'RSA':
      if key_length >= 2048:
        return True, 'RSA key length passed: ' + str(key_length) + ' >= 2048'
      else:
        return False, 'RSA key length too short: ' + str(key_length) + ' < 2048'

    # Check if the public key is of EC type
    elif key_type == 'EC':
      if key_length >= 224:
        return True, 'EC key length passed: ' + str(key_length) + ' >= 224'
      else:
        return False, 'EC key length too short: ' + str(key_length) + ' < 224'
    else:
      return False, 'Key is not RSA or EC type'

  def validate_signature(self, host):
    # Reconnect to the device but with validate signature option
    # set to true which will check for proper cert chains
    # within the valid CA root certs stored on the server
    if self.validate_trusted_ca_signature(host):
      LOGGER.info('Authorized Certificate Authority signature confirmed')
      return True, 'Authorized Certificate Authority signature confirmed'
    else:
      LOGGER.info('Authorized Certificate Authority signature not present')

      device_cert_path = os.path.join(self._cert_out_dir, self._dev_cert_file)
      signed, ca_file = self.validate_local_ca_signature(
          device_cert_path=device_cert_path)
      if signed:
        return True, 'Device signed by cert:' + ca_file
    return False, 'Device certificate has not been signed'

  def validate_local_ca_signature(self, device_cert_path):
    bin_file = self._bin_dir + '/check_cert_signature.sh'
    # Get a list of all root certificates
    root_certs = os.listdir(self._root_certs_dir)
    LOGGER.info('Root Certs Found: ' + str(len(root_certs)))
    for root_cert in root_certs:
      try:
        # Create the file path
        root_cert_path = os.path.join(self._root_certs_dir, root_cert)
        LOGGER.info('Checking root cert: ' + str(root_cert_path))
        args = f'{root_cert_path} {device_cert_path}'
        command = f'{bin_file} {args}'
        response = util.run_command(command)
        if f'{device_cert_path}: OK' in str(response):
          LOGGER.info('Device signed by cert:' + root_cert)
          return True, root_cert_path
        else:
          LOGGER.info('Device not signed by cert: ' + root_cert)
      except Exception as e:  # pylint: disable=W0718
        LOGGER.error('Failed to check cert:' + root_cert)
        LOGGER.error(str(e))
    return False, None

  def validate_trusted_ca_signature(self, host):
    # Reconnect to the device but with validate signature option
    # set to true which will check for proper cert chains
    # within the valid CA root certs stored on the server
    LOGGER.info(
        'Checking for valid signature from authorized Certificate Authorities')
    public_cert = self.get_public_certificate(host,
                                              validate_cert=True,
                                              tls_version='1.2')
    if public_cert:
      LOGGER.info('Authorized Certificate Authority signature confirmed')
      return True, 'Authorized Certificate Authority signature confirmed'
    else:
      LOGGER.info('Authorized Certificate Authority signature not present')
      LOGGER.info('Checking for authorized CA certificate chain')
      device_cert_path = os.path.join(self._cert_out_dir, self._dev_cert_file)
      return self.validate_cert_chain(device_cert_path=device_cert_path)

  def validate_cert_chain(self, device_cert_path):
    LOGGER.info('Validating certificate chain')
    # Load the certificate from the PEM file
    with open(device_cert_path, 'rb') as cert_file:
      cert_bytes = cert_file.read()

    # Load pem encoding into a certifiate so we can process the contents
    certificate = crypto.load_certificate(crypto.FILETYPE_PEM, cert_bytes)

    ca_issuer_cert, cert_file_path = self.get_ca_issuer(certificate)
    if ca_issuer_cert is not None and cert_file_path is not None:
      LOGGER.info('CA Issuer resolved')
      cert_text = crypto.dump_certificate(crypto.FILETYPE_TEXT,
                                          ca_issuer_cert).decode()
      LOGGER.info(cert_text)
      return self.validate_trusted_ca_signature_chain(
          device_cert_path=device_cert_path,
          intermediate_cert_path=cert_file_path)
    else:
      return False

  def validate_trusted_ca_signature_chain(self, device_cert_path,
                                          intermediate_cert_path):
    bin_file = self._bin_dir + '/check_cert_chain_signature.sh'
    # Combine the device and intermediate certificates
    with open(device_cert_path, 'r', encoding='utf-8') as f:
      dev_cert = f.read()
    with open(intermediate_cert_path, 'r', encoding='utf-8') as f:
      inter_cert = f.read()

    combined_cert_name = 'device_cert_full.crt'
    combined_cert = dev_cert + inter_cert
    combined_cert_path = os.path.join(self._cert_out_dir, combined_cert_name)
    with open(combined_cert_path, 'w', encoding='utf-8') as f:
      f.write(combined_cert)

    # Use openssl script to validate the combined certificate
    # against the available trusted CA's
    args = f'{intermediate_cert_path} {combined_cert_path}'
    command = f'{bin_file} {args}'
    response = util.run_command(command)
    return combined_cert_name + ': OK' in str(response)

  def get_ca_issuer(self, certificate):
    cert_file_path = None
    ca_issuer_cert = None
    ca_issuers_uri = self.resolve_ca_issuer(certificate)
    if ca_issuers_uri is not None:
      ca_issuer_cert = self.get_certificate(ca_issuers_uri)
      if ca_issuer_cert is not None:
        # Write the intermediate certificate to file
        cert_name = ca_issuers_uri.split('/')[-1]
        cert_file_path = self.write_cert_to_file(cert_name, ca_issuer_cert)
    return ca_issuer_cert, cert_file_path

  def resolve_ca_issuer(self, certificate):
    LOGGER.info('Resolving CA Issuer')
    # Print the certificate information
    cert_text = crypto.dump_certificate(crypto.FILETYPE_TEXT,
                                        certificate).decode()
    # Extract 'CA Issuers - URI' field
    ca_issuers_uri = None
    for line in cert_text.split('\n'):
      if 'CA Issuers - URI' in line:
        ca_issuers_uri = line.split(':', 1)[1].strip()
        break
    LOGGER.info(f'CA Issuers resolved: {ca_issuers_uri}')
    return ca_issuers_uri

  def get_certificate(self, uri, timeout=10):
    LOGGER.info(f'Resolving certificate from {uri}')
    certificate = None
    try:
      # Fetch the certificate file from the URI
      response = requests.get(uri, timeout=timeout)
      response.raise_for_status()  # Raise an error for HTTP errors

      # Load the certificate from the PEM format
      certificate_data = response.content

      try:
        LOGGER.info('Attempting to resolve certificate in PEM format')
        # Load the certificate from the PEM format
        certificate = x509.load_pem_x509_certificate(certificate_data,
                                                     default_backend())
        LOGGER.info('PEM format certificate resolved')
      except ValueError:
        # Load the certificate from the DER format
        LOGGER.info('Failed to resolve PEM format, attempting DER format')
        certificate = x509.load_der_x509_certificate(certificate_data,
                                                     default_backend())
        LOGGER.info('DER format certificate resolved.')
      except Exception:  # pylint: disable=W0718
        LOGGER.error('Failed to load certificate in expected formats')
    except requests.exceptions.RequestException as e:
      LOGGER.error(f'Error fetching certificate from URI: {e}')
    return certificate

  def process_tls_server_results(self, tls_1_2_results, tls_1_3_results):
    results = ''
    if tls_1_2_results[0] is None and tls_1_3_results[0] is not None:
      # Validate only TLS 1.3 results
      description = 'TLS 1.3' + (' not' if not tls_1_3_results[0] else
                                 '') + ' validated: ' + tls_1_3_results[1]
      results = tls_1_3_results[0], description
    elif tls_1_3_results[0] is None and tls_1_2_results[0] is not None:
      # Vaidate only TLS 1.2 results
      description = 'TLS 1.2' + (' not' if not tls_1_2_results[0] else
                                 '') + ' validated: ' + tls_1_2_results[1]
      results = tls_1_2_results[0], description
    elif tls_1_3_results[0] is not None and tls_1_2_results[0] is not None:
      # Validate both results
      description = 'TLS 1.2' + (' not' if not tls_1_2_results[0] else
                                 '') + ' validated: ' + tls_1_2_results[1]
      description += '\nTLS 1.3' + (' not' if not tls_1_3_results[0] else
                                    '') + ' validated: ' + tls_1_3_results[1]
      results = tls_1_2_results[0] or tls_1_3_results[0], description
    else:
      description = f'TLS 1.2 not validated: {tls_1_2_results[1]}'
      description += f'\nTLS 1.3 not validated: {tls_1_3_results[1]}'
      results = None, description
    LOGGER.info('TLS server test results: ' + str(results))
    return results

  def validate_tls_server(self, host, tls_version):
    cert_pem = self.get_public_certificate(host,
                                           validate_cert=False,
                                           tls_version=tls_version)
    if cert_pem:

      # Write pem encoding to a file
      self.write_cert_to_file(self._dev_cert_file, cert_pem)

      # Load pem encoding into a certifiate so we can process the contents
      public_cert = crypto.load_certificate(crypto.FILETYPE_PEM, cert_pem)

      # Print the certificate information
      cert_text = crypto.dump_certificate(crypto.FILETYPE_TEXT,
                                          public_cert).decode()
      LOGGER.info('Device certificate:\n' + cert_text)

      # Validate the certificates time range
      tr_valid = self.verify_certificate_timerange(public_cert)

      # Resolve the public key
      public_key = self.get_public_key(public_cert)
      if public_key:
        key_valid = self.verify_public_key(public_key)

      sig_valid = self.validate_signature(host)

      # Check results
      cert_valid = tr_valid[0] and key_valid[0] and sig_valid[0]
      test_details = tr_valid[1] + '\n' + key_valid[1] + '\n' + sig_valid[1]
      LOGGER.info('Certificate validated: ' + str(cert_valid))
      LOGGER.info('Test details:\n' + test_details)
      return cert_valid, test_details
    else:
      LOGGER.info('Failed to resolve public certificate')
      return None, 'Failed to resolve public certificate'

  def write_cert_to_file(self, cert_name, cert):
    try:
      cert_file = os.path.join(self._cert_out_dir, cert_name)
      if isinstance(cert, str):
        with open(cert_file, 'w', encoding='UTF-8') as f:
          f.write(cert)
        return cert_file
      elif isinstance(cert, bytes):
        with open(cert_file, 'wb') as f:
          f.write(cert)
        return cert_file
      elif isinstance(cert, x509.Certificate):
        with open(cert_file, 'wb') as f:
          # Serialize the certificate to PEM format
          certificate_bytes = cert.public_bytes(
              encoding=serialization.Encoding.PEM)
          f.write(certificate_bytes)
        return cert_file
      else:
        LOGGER.error(f'Cannot write certificate file, '
                     f'unsupported content type: {type(cert)}')
    except Exception as e:  # pylint: disable=W0718
      LOGGER.error(f'Failed to write certificate to file: {e}')
    return None

  def get_ciphers(self, capture_file, dst_ip, dst_port):
    bin_file = self._bin_dir + '/get_ciphers.sh'
    args = f'{capture_file} {dst_ip} {dst_port}'
    command = f'{bin_file} {args}'
    response = util.run_command(command)
    ciphers = response[0].split('\n')
    return ciphers

  def get_hello_packets(self, capture_files, src_ip, tls_version):
    combined_results = []
    for capture_file in capture_files:
      bin_file = self._bin_dir + '/get_client_hello_packets.sh'
      args = f'{capture_file} {src_ip} {tls_version}'
      command = f'{bin_file} {args}'
      response = util.run_command(command)
      packets = response[0].strip()
      if len(packets) > 0:
        # Parse each packet and append key-value pairs to combined_results
        result = self.parse_packets(json.loads(packets), capture_file)
        combined_results.extend(result)
    return combined_results

  def get_handshake_complete(self, capture_files, src_ip, dst_ip, tls_version):
    combined_results = ''
    for capture_file in capture_files:
      bin_file = self._bin_dir + '/get_handshake_complete.sh'
      args = f'{capture_file} {src_ip} {dst_ip} {tls_version}'
      command = f'{bin_file} {args}'
      response = util.run_command(command)
      if len(response) > 0:
        combined_results += response[0]
    return combined_results

  # Resolve all connections from the device that don't use TLS
  def get_non_tls_packetes(self, client_ip, capture_files):
    combined_packets = []
    for capture_file in capture_files:
      bin_file = self._bin_dir + '/get_non_tls_client_connections.sh'
      args = f'{capture_file} {client_ip}'
      command = f'{bin_file} {args}'
      response = util.run_command(command)
      if len(response) > 0:
        packets = json.loads(response[0].strip())
        combined_packets.extend(packets)
    return combined_packets

  # Resolve all connections from the device that use TLS
  def get_tls_client_connection_packetes(self, client_ip, capture_files):
    combined_packets = []
    for capture_file in capture_files:
      bin_file = self._bin_dir + '/get_tls_client_connections.sh'
      args = f'{capture_file} {client_ip}'
      command = f'{bin_file} {args}'
      response = util.run_command(command)
      packets = json.loads(response[0].strip())
      combined_packets.extend(packets)
    return combined_packets

  # Resolve any TLS packets for the specified version. Does not care if the
  # connections are established or any other validation only
  # that there is some level of connection attempt from the device
  # using the TLS version specified.
  def get_tls_packets(self, capture_files, src_ip, tls_version):
    combined_results = []
    for capture_file in capture_files:
      bin_file = self._bin_dir + '/get_tls_packets.sh'
      args = f'{capture_file} {src_ip} {tls_version}'
      command = f'{bin_file} {args}'
      response = util.run_command(command)
      packets = response[0].strip()
      # Parse each packet and append key-value pairs to combined_results
      result = self.parse_packets(json.loads(packets), capture_file)
      combined_results.extend(result)
    return combined_results

  def parse_packets(self, packets, capture_file):
    hello_packets = []
    for packet in packets:
      # Extract all the basic IP information about the packet
      packet_layers = packet['_source']['layers']
      dst_ip = packet_layers['ip.dst'][0] if 'ip.dst' in packet_layers else ''
      src_ip = packet_layers['ip.src'][0] if 'ip.src' in packet_layers else ''
      dst_port = packet_layers['tcp.dstport'][
          0] if 'tcp.dstport' in packet_layers else ''

      # Resolve the ciphers used in this packet and validate expected ones exist
      ciphers = self.get_ciphers(capture_file, dst_ip, dst_port)
      cipher_support = self.is_ecdh_and_ecdsa(ciphers)

      # Put result together
      hello_packet = {}
      hello_packet['dst_ip'] = dst_ip
      hello_packet['src_ip'] = src_ip
      hello_packet['dst_port'] = dst_port
      hello_packet['cipher_support'] = cipher_support

      hello_packets.append(hello_packet)
    return hello_packets

  def process_hello_packets(self, hello_packets, tls_version='1.2'):
    # Validate the ciphers only for tls 1.2
    client_hello_results = {'valid': [], 'invalid': []}
    if tls_version == '1.2':
      for packet in hello_packets:
        if packet['dst_ip'] not in str(client_hello_results['valid']):
          LOGGER.info('Checking client ciphers: ' + str(packet))
          if packet['cipher_support']['ecdh'] and packet['cipher_support'][
              'ecdsa']:
            LOGGER.info('Valid ciphers detected')
            client_hello_results['valid'].append(packet)
            # If a previous hello packet to the same destination failed,
            # we can now remove it as it has passed on a different attempt
            if packet['dst_ip'] in str(client_hello_results['invalid']):
              LOGGER.info(str(client_hello_results['invalid']))
              for invalid_packet in client_hello_results['invalid']:
                if packet['dst_ip'] in str(invalid_packet):
                  client_hello_results['invalid'].remove(invalid_packet)
          else:
            LOGGER.info('Invalid ciphers detected')
            if packet['dst_ip'] not in str(client_hello_results['invalid']):
              client_hello_results['invalid'].append(packet)
    else:
      # No cipher check for TLS 1.3
      client_hello_results['valid'] = hello_packets
    return client_hello_results

  # Check if the device has made any outbound connections that don't
  # use TLS. Since some protocols do use non-encrypted methods (NTP, DHCP, etc.)
  # we will assume any local connections using the same IP subnet as our
  # local network are approved and only connections to IP addresses outside
  # our network will be flagged.
  def get_non_tls_client_connection_ips(self, client_ip, capture_files):
    LOGGER.info('Checking client for non-TLS client connections')
    packets = self.get_non_tls_packetes(client_ip=client_ip,
                                        capture_files=capture_files)

    # Extract the subnet from the client IP address
    src_ip = ipaddress.ip_address(client_ip)
    src_subnet = ipaddress.ip_network(src_ip, strict=False)
    subnet_with_mask = ipaddress.ip_network(
        src_subnet, strict=False).supernet(new_prefix=24)

    non_tls_dst_ips = set()  # Store unique destination IPs
    for packet in packets:
      # Check if an IP address is within the specified subnet.
      dst_ip = ipaddress.ip_address(packet['_source']['layers']['ip.dst'][0])
      if not dst_ip in subnet_with_mask:
        non_tls_dst_ips.add(str(dst_ip))

    return non_tls_dst_ips

  # Check if the device has made any outbound connections that don't
  # use TLS. Since some protocols do use non-encrypted methods (NTP, DHCP, etc.)
  # we will assume any local connections using the same IP subnet as our
  # local network are approved and only connections to IP addresses outside
  # our network will be flagged.
  def get_unsupported_tls_ips(self, client_ip, capture_files):
    LOGGER.info('Checking client for unsupported TLS client connections')
    tls_1_0_packets = self.get_tls_packets(capture_files, client_ip, '1.0')
    tls_1_1_packets = self.get_tls_packets(capture_files, client_ip, '1.1')

    unsupported_tls_dst_ips = {}
    if len(tls_1_0_packets) > 0:
      for packet in tls_1_0_packets:
        dst_ip = packet['dst_ip']
        tls_version = '1.0'
        if dst_ip not in unsupported_tls_dst_ips:
          LOGGER.info(f'''Unsupported TLS {tls_version}
                      connections detected to {dst_ip}''')
          unsupported_tls_dst_ips[dst_ip] = [tls_version]

    if len(tls_1_1_packets) > 0:
      for packet in tls_1_1_packets:
        dst_ip = packet['dst_ip']
        tls_version = '1.1'
        # Check if the IP is already in the dictionary
        if dst_ip in unsupported_tls_dst_ips:
          # If the IP is already present, append the new TLS version to the
          # list
          unsupported_tls_dst_ips[dst_ip].append(tls_version)
        else:
          # If the IP is not present, create a new list with the current
          # TLS version
          LOGGER.info(f'''Unsupported TLS {tls_version} connections detected
                      to {dst_ip}''')
          unsupported_tls_dst_ips[dst_ip] = [tls_version]
    return unsupported_tls_dst_ips

  # Check if the device has made any outbound connections that use any
  # version of TLS.
  def get_tls_client_connection_ips(self, client_ip, capture_files):
    LOGGER.info('Checking client for TLS client connections')
    packets = self.get_tls_client_connection_packetes(
        client_ip=client_ip, capture_files=capture_files)

    tls_dst_ips = set()  # Store unique destination IPs
    for packet in packets:
      dst_ip = ipaddress.ip_address(packet['_source']['layers']['ip.dst'][0])
      tls_dst_ips.add(str(dst_ip))
    return tls_dst_ips

  def is_private_ip(self, ip):
    # Check if an IP is within any private IP subnet
    for subnet in PRIVATE_SUBNETS:
      if ip in subnet:
        return True
    return False

  def validate_tls_client(self, client_ip, tls_version, capture_files):
    LOGGER.info('Validating client for TLS: ' + tls_version)
    hello_packets = self.get_hello_packets(capture_files, client_ip,
                                           tls_version)
    client_hello_results = self.process_hello_packets(hello_packets,
                                                      tls_version)

    handshakes = {'complete': [], 'incomplete': []}
    for packet in client_hello_results['valid']:
      # Filter out already tested IP's since only 1 handshake success is needed
      if not packet['dst_ip'] in handshakes['complete'] and not packet[
          'dst_ip'] in handshakes['incomplete']:
        handshake_complete = self.get_handshake_complete(
            capture_files, packet['src_ip'], packet['dst_ip'], tls_version)

        # One of the responses will be a complaint about running as root so
        # we have to have at least 2 entries to consider a completed handshake
        if len(handshake_complete) > 1:
          LOGGER.info('TLS handshake completed from: ' + packet['dst_ip'])
          handshakes['complete'].append(packet['dst_ip'])
        else:
          LOGGER.warning('No TLS handshakes completed from: ' +
                         packet['dst_ip'])
          handshakes['incomplete'].append(packet['dst_ip'])

    for handshake in handshakes['complete']:
      LOGGER.info('Valid TLS client connection to server: ' + str(handshake))

    # Process and return the results
    tls_client_details = ''
    tls_client_valid = None
    if len(hello_packets) > 0:
      if len(client_hello_results['invalid']) > 0:
        tls_client_valid = False
        for result in client_hello_results['invalid']:
          tls_client_details += 'Client hello packet to ' + result[
              'dst_ip'] + ' did not have expected ciphers:'
          if not result['cipher_support']['ecdh']:
            tls_client_details += ' ecdh '
          if not result['cipher_support']['ecdsa']:
            tls_client_details += 'ecdsa'
          tls_client_details += '\n'
      if len(handshakes['incomplete']) > 0:
        for result in handshakes['incomplete']:
          tls_client_details += 'Incomplete handshake detected from server: '
          tls_client_details += result + '\n'
      if len(handshakes['complete']) > 0:
        # If we haven't already failed the test from previous checks
        # allow a passing result
        if tls_client_valid is None:
          tls_client_valid = True
        for result in handshakes['complete']:
          tls_client_details += 'Completed handshake detected from server: '
          tls_client_details += result + '\n'
    else:
      LOGGER.info('No client hello packets detected')
      tls_client_details = 'No client hello packets detected'

    # Resolve all non-TLS related client connections
    non_tls_client_ips = self.get_non_tls_client_connection_ips(
        client_ip, capture_files)

    # Resolve all TLS related client connections
    tls_client_ips = self.get_tls_client_connection_ips(client_ip,
                                                        capture_files)

    # Filter out all outbound TLS connections regardless on whether
    # or not they were validated.  If they were not validated,
    # they will already be failed by those tests and we only
    # need to report true unencrypted oubound connections
    if len(non_tls_client_ips) > 0:
      for ip in non_tls_client_ips:
        if self.is_private_ip(IPv4Address(ip)):
          # Allow private IP unencrypted traffic but report in results
          LOGGER.info(
              f'Non-TLS client traffic detected on private subnet to {ip}')
          tls_client_details += (
              f'\nAllowing non-TLS traffic to private subnet {ip}')
        elif ip not in tls_client_ips:
          tls_client_valid = False
          tls_client_details += f'''\nNon-TLS connection detected to {ip}'''
        else:
          LOGGER.info(f'''TLS connection detected to {ip}.
                       Ignoring non-TLS traffic detected to this IP''')

    unsupported_tls_ips = self.get_unsupported_tls_ips(client_ip, capture_files)
    if len(unsupported_tls_ips) > 0:
      tls_client_valid = False
      for ip, tls_versions in unsupported_tls_ips.items():
        for version in tls_versions:
          tls_client_details += f'''\nUnsupported TLS {version}
          connection detected to {ip}'''
    return tls_client_valid, tls_client_details

  def is_ecdh_and_ecdsa(self, ciphers):
    ecdh = False
    ecdsa = False
    for cipher in ciphers:
      ecdh |= 'ECDH' in cipher
      ecdsa |= 'ECDSA' in cipher
    return {'ecdh': ecdh, 'ecdsa': ecdsa}
