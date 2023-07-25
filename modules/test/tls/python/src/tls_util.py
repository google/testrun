import ssl
import socket
from datetime import datetime
from OpenSSL import crypto
import json
import os
import common.util as util

LOG_NAME = 'tls_util'
LOGGER = None
DEFAULT_BIN_DIR = '/testrun/bin'
DEFAULT_CERTS_OUT_DIR = '/runtime/output/certs'
DEFAULT_ROOT_CERTS_DIR = '/testrun/root_certs'

class TLSUtil():
  """Helper class for various tests concerning TLS communications"""

  def __init__(self, logger, bin_dir=DEFAULT_BIN_DIR, cert_out_dir=DEFAULT_CERTS_OUT_DIR, root_certs_dir=DEFAULT_ROOT_CERTS_DIR):
    global LOGGER
    LOGGER = logger
    self._bin_dir = bin_dir
    self._dev_cert_file = cert_out_dir + '/device_cert.crt'
    self._root_certs_dir = root_certs_dir

  def get_public_certificate(self, host, port=443,validate_cert=False, tls_version='1.2'):
    try:
      context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
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
      return False, "Key is not RSA or EC type"

  def validate_signature(self,host):
    # Reconnect to the device but with validate signature option
    # set to true which will check for proper cert chains
    # within the valid CA root certs stored on the server
    LOGGER.info('Checking for valid signature from authorized Certificate Authorities')
    public_cert = self.get_public_certificate(host,validate_cert=True, tls_version='1.2')
    if public_cert:
      LOGGER.info('Authorized Certificate Authority signature confirmed')
      return True, 'Authorized Certificate Authority signature confirmed'
    else:
      LOGGER.info('Authorized Certificate Authority signature not present')
      LOGGER.info('Resolving configured root certificates')
      bin_file = self._bin_dir + "/check_cert_signature.sh"
      # Get a list of all root certificates
      root_certs = os.listdir(self._root_certs_dir)
      for root_cert in root_certs:
        try:
          # Create the file path
          root_cert_path = os.path.join(self._root_certs_dir, root_cert)
          
          args = (f'{root_cert_path} {self._dev_cert_file}')
          command = f'{bin_file} {args}'
          response = util.run_command(command)
          if 'device_cert.crt: OK' in str(response):
            LOGGER.info('Device signed by cert:' + root_cert)
            return True, 'Device signed by cert:' + root_cert
          else:
            LOGGER.info('Device not signed by cert: ' + root_cert)
        except Exception as e:
          LOGGER.error('Failed to check cert:' + root_cert)
          LOGGER.error(str(e))
    return False, 'Device certificate has not been signed'

  def validate_tls_server(self, host, tls_version, port=443):
    cert_pem = self.get_public_certificate(host,validate_cert=False, tls_version='1.2')
    if cert_pem:

      # Write pem encoding to a file
      self.write_cert_to_file(cert_pem)

      # Load pem encoding into a certifiate so we can process the contents
      public_cert = crypto.load_certificate(crypto.FILETYPE_PEM, cert_pem)

      # Print the certificate information
      cert_text = crypto.dump_certificate(crypto.FILETYPE_TEXT,
                                          public_cert).decode()

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
      LOGGER.info('Test Details:\n' + test_details)
      return cert_valid, test_details
    else:
      LOGGER.info('Failed to resolve public certificate')

  def write_cert_to_file(self,pem_cert):
    with open(self._dev_cert_file, 'w',encoding='UTF-8') as f:
      f.write(pem_cert)

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
    packets = response[0].strip()
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
    LOGGER.info("Validating client for TLS: " + tls_version)
    hello_packets = self.get_hello_packets(capture_file, client_ip, tls_version)

    # Validate the ciphers only for tls 1.2
    client_hello_results = {"valid": [], "invalid": []}
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
              client_hello_results['invalid'].remove(packet)
          else:
          	LOGGER.info("Invalid ciphers detected")
          	if packet['dst_ip'] not in str(client_hello_results['invalid']):
          	  client_hello_results['invalid'].append(packet)
    else:
      # No cipher check for TLS 1.3
      client_hello_results['valid'] = hello_packets

    handshakes = {'complete': [], 'incomplete': []}
    for packet in client_hello_results['valid']:
      # Filter out already tested IP's since only 1 handshake success is needed
      if not packet['dst_ip'] in handshakes['complete'] and not packet[
          'dst_ip'] in handshakes['incomplete']:
        handshake_complete = self.get_handshake_complete(
            capture_file, packet['src_ip'], packet['dst_ip'], tls_version)

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
          tls_client_details += 'Incomplete handshake detected from server: ' + result + '\n'
      if len(handshakes['complete']) > 0:
        # If we haven't already failed the test from previous checks
        # allow a passing result
        if not tls_client_valid:
          tls_client_valid = True
        for result in handshakes['complete']:
          tls_client_details += 'Completed handshake detected from server: ' + result + '\n'
    else:
      LOGGER.info('No client hello packets detected. Skipping')
      tls_client_details = 'No client hello packets detected. Skipping'
    return tls_client_valid, tls_client_details

  def is_ecdh_and_ecdsa(self, ciphers):
    ecdh = False
    ecdsa = False
    for cipher in ciphers:
      ecdh |= 'ECDH' in cipher
      ecdsa |= 'ECDSA' in cipher
    return {'ecdh': ecdh, 'ecdsa': ecdsa}
