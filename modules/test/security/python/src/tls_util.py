import ssl
import socket
from datetime import datetime
from OpenSSL import crypto
from scapy.all import rdpcap, IP, TCP
import json

LOG_NAME = 'tls_util'
LOGGER = None
DEFAULT_BIN_DIR = '/testrun/bin'

import common.util as util


class TLSUtil():
  """Helper class for various tests concerning TLS communications"""

  def __init__(self, logger, bin_dir=DEFAULT_BIN_DIR):
    global LOGGER
    LOGGER = logger
    self._bin_dir = bin_dir

  def get_public_certificate(self, host, port=443, tls_version='1.2'):
    try:
      # Disable certificate verification
      context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
      context.check_hostname = False
      context.verify_mode = ssl.CERT_NONE

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

      if cert_pem:
        cert = crypto.load_certificate(crypto.FILETYPE_PEM, cert_pem)
    except ConnectionRefusedError:
      LOGGER.info(f'Connection to {host}:{port} was refused.')
      return None
    except socket.gaierror:
      LOGGER.info(f'Failed to resolve the hostname {host}.')
      return None
    except ssl.SSLError as e:
      LOGGER.info(f'SSL error occurred: {e}')
      return None

    return cert

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
      return False, "Key is not RSA or EC type"

  def validate_signature(self, public_cert):
    print('Validating signature: TODO')

  def validate_tls_server(self, host, tls_version, port=443):
    public_cert = self.get_public_certificate(host, tls_version='1.2')
    if public_cert:
      # Print the certificate information
      cert_text = crypto.dump_certificate(crypto.FILETYPE_TEXT,
                                          public_cert).decode()
      LOGGER.info(cert_text)

      # Validate the certificates time range
      tr_valid = self.verify_certificate_timerange(public_cert)

      # Resolve the public key
      public_key = self.get_public_key(public_cert)
      if public_key:
        key_valid = self.verify_public_key(public_key)

      # Check results
      cert_valid = tr_valid[0] and key_valid[0]
      test_details = tr_valid[1] + '\n' + key_valid[1]
      LOGGER.info('Certificate validated: ' + str(cert_valid))
      LOGGER.info('Test Details:\n' + test_details)
      return cert_valid, test_details
    else:
      LOGGER.info('Failed to resolve public certificate')

  def get_ciphers(self, capture_file, dst_ip, dst_port):
    bin_file = self._bin_dir + "/get_ciphers.sh"
    args = (f'{capture_file} {dst_ip} {dst_port}')
    command = f'{bin_file} {args}'
    response = util.run_command(command)
    ciphers = response[0].split("\n")
    return ciphers

  def get_hello_packets(self, capture_file, src_ip, tls_version):
    bin_file = self._bin_dir + "/get_client_hello_packets.sh"
    args = (f'{capture_file} {src_ip} {tls_version}')
    command = f'{bin_file} {args}'
    response = util.run_command(command)
    packets = response[0]
    return self.parse_hello_packets(json.loads(packets), capture_file)

  def get_handshake_complete(self, capture_file, src_ip, dst_ip, tls_version):
    bin_file = self._bin_dir + "/get_handshake_complete.sh"
    args = (f'{capture_file} {src_ip} {dst_ip} {tls_version}')
    command = f'{bin_file} {args}'
    response = util.run_command(command)
    return response

  def parse_hello_packets(self, packets, capture_file):
    hello_packets = []
    for packet in packets:
      # Extract all the basic IP information about the packet
      dst_ip = packet['_source']['layers']['ip.dst'][0]
      src_ip = packet['_source']['layers']['ip.src'][0]
      dst_port = packet['_source']['layers']['tcp.dstport'][0]

      # Resolve the ciphers used in this packet and validate expected ones exist
      ciphers = self.get_ciphers(capture_file, dst_ip, dst_port)
      cipher_support = self.is_ecdh_and_ecdsa(ciphers)

      # Put result together
      hello_packet = {}
      hello_packet['dst_ip'] = packet['_source']['layers']['ip.dst'][0]
      hello_packet['src_ip'] = packet['_source']['layers']['ip.src'][0]
      hello_packet['dst_port'] = packet['_source']['layers']['tcp.dstport'][0]
      hello_packet['cipher_support'] = cipher_support

      hello_packets.append(hello_packet)
    return hello_packets

  def validate_tls_client(self, client_ip, tls_version, capture_file):
    hello_packets = self.get_hello_packets(capture_file, client_ip, tls_version)
    # Validate the ciphers only for tls 1.2
    if tls_version == '1.2':
      for packet in hello_packets:
        LOGGER.info("Hello Packet: " + str(packet))
      if not packet['cipher_support']['ecdh'] or not packet['cipher_support'][
          'ecdsa']:
        hello_packets.remove(packet)

    handshakes = {"complete":[],"incomplete":[]}
    for packet in hello_packets:
      # Filter out already tested IP's since only 1 handshake success is needed
      if not packet['dst_ip'] in handshakes['complete'] and not packet['dst_ip'] in handshakes['incomplete']:
        handshake_complete = self.get_handshake_complete(
            capture_file, packet['src_ip'], packet['dst_ip'], tls_version)

        # One of the responses will be a complaint about running as root so
        # we have to have at least 2 entries to consider a completed handshake
        if len(handshake_complete) > 1:
          LOGGER.info("Handshake completed from: " + packet['dst_ip'])
          handshakes['complete'].append(packet['dst_ip'])
        else:
          handshakes['incomplete'].append(packet['dst_ip'])

    for handshake in handshakes['complete']:
      LOGGER.info("Valid Client: " + str(handshake))
    return len(handshakes['complete']) > 0, 'Test not yet implemented'

  def is_ecdh_and_ecdsa(self, ciphers):
    ecdh = False
    ecdsa = False
    for cipher in ciphers:
      ecdh |= 'ECDH' in cipher
      ecdsa |= 'ECDSA' in cipher
    return {'ecdh': ecdh, 'ecdsa': ecdsa}
