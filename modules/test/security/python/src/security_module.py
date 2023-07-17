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
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      return self._tls_util.validate_tls_server(self._device_ipv4_addr,tls_version='1.2')
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')

  def _security_tls_v1_3_server(self):
    LOGGER.info('Running security.tls.v1_3_server')
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      return self._tls_util.validate_tls_server(self._device_ipv4_addr,tls_version='1.3')
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')

  def _security_tls_v1_2_client(self):
    LOGGER.info('Running security.tls.v1_2_client')
    return None, 'Test not yet implemented'


  def _resolve_device_ip(self):
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4(self)