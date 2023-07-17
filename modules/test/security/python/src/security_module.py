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
# import ssl
# import socket
# from cryptography import x509
# from cryptography.hazmat.backends import default_backend
# from datetime import datetime
from tls_util import TLSUtil

LOG_NAME = 'test_security'
LOGGER = None

class SecurityModule(TestModule):
  """An example testing module."""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    global LOGGER
    LOGGER = self._get_logger()
    self._tls_util = TLSUtil(LOGGER)

  def _security_tls_v1_2_server(self):
    LOGGER.info('Running security.tls.v1_2_server')
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4(self)

    return self._tls_util.validate_tls_server(self._ipv4_addr,tls_version='1.2')

    # # If the ipv4 address wasn't resolved yet, try again
    # if self._device_ipv4_addr is None:
    #   self._device_ipv4_addr = self._get_device_ipv4(self)

    # try:
    #   public_cert = self._get_public_certificate(self._device_ipv4_addr)
    #   LOGGER.info('Public Certificate: ' + str(public_cert))
    # except ConnectionRefusedError as e:
    #   LOGGER.info('Could not connect to device, skipping')
    #   return None, 'Could not connect to device, skipping'

    # public_key = self._get_public_key(public_cert)
    # LOGGER.info('Public Key: ' + str(public_key))

    # self._verify_certificate_timerange(public_cert)
    # self._verify_public_key(public_key)
    # return None, 'Test not yet implemented'

  def _security_tls_v1_2_client(self):
    LOGGER.info('Running security.tls.v1_2_client')
    return None, 'Test not yet implemented'

#   def _verify_certificate_timerange(public_cert):
#     # Extract the notBefore and notAfter dates from the certificate
#     not_before = cert.not_valid_before
#     not_after = cert.not_valid_after

#     LOGGER.info('Certificate valid from: ' + str(not_before) + '-' + str(not_after))

#     # Get the current date
#     current_date = datetime.utcnow()

#     # Check if today's date is within the certificate's validity range
#     if not_before <= current_date <= not_after:
#       return True, 'Certificate has a valid time range'    
#     elif current_date <= not_before:
#       return False, 'Certificate is not yet valid'
#     else:
#       return False, 'Certificate has expired'

#   def _verify_public_key(self,public_key):
#     # Serialize the public key to get its size/length
#     public_key_pem = public_key.public_bytes(
#         encoding=serialization.Encoding.PEM,
#         format=serialization.PublicFormat.SubjectPublicKeyInfo
#     )

#     # Calculate the key length based on the serialized public key
#     key_length = len(public_key_pem) * 8

#     # Check if the public key is of RSA type
#     if isinstance(public_key, rsa.RSAPublicKey):
#       if key_length >= 2048:
#         return True, 'RSA key length passed: ' + key_length  + '>= 2048'
#       else:
#         return False, 'RSA key length too short: ' + str(key_length) + '< 2048'

#     # Check if the public key is of EC type
#     elif isinstance(public_key, ec.EllipticCurvePublicKey):
#       if key_length >= 224:
#         return True, 'EC key length passed: ' + key_length  + '>= 224'
#       else:
#         return False, 'EC key length too short: ' + str(key_length) + '< 224'
#     else:
#         return False, "Key is not RSA or EC type"

#   def _get_public_key(self,cert_pem):
#     # Parse the PEM certificate using cryptography
#     cert = x509.load_pem_x509_certificate(cert_pem.encode(), default_backend())

#     # Extract and return the public key from the certificate
#     public_key = cert.public_key()
#     return public_key

#   def _get_public_certificate(self,host, port=443):
#     # Disable certificate verification
#     context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
#     context.check_hostname = False
#     context.verify_mode = ssl.CERT_NONE

#     # Create an SSL/TLS socket
#     with socket.create_connection((host, port)) as sock:
#         with context.wrap_socket(sock, server_hostname=host) as secure_sock:
#             # Get the server's certificate in PEM format
#             cert_pem = secure_sock.getpeercert(binary_form=False)

#     # Parse the PEM certificate using cryptography
#     cert = x509.load_pem_x509_certificate(cert_pem.encode(), default_backend())

#     return cert


# try:
#   sec_mod = SecurityModule()
#   public_cert = sec_mod._get_public_certificate('google.com')
#   LOGGER.info('Public Certificate: ' + str(public_cert))
# except ConnectionRefusedError as e:
#   LOGGER.info('Could not connect to device, skipping')

# public_key = sec_mod._get_public_key(public_cert)
# LOGGER.info('Public Key: ' + str(public_key))

# sec_mod._verify_certificate_timerange(public_cert)
# sec_mod._verify_public_key(public_key)