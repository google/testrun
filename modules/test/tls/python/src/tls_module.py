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

LOG_NAME = 'test_tls'
LOGGER = None
STARTUP_CAPTURE_FILE = '/runtime/device/startup.pcap'
MONITOR_CAPTURE_FILE = '/runtime/device/monitor.pcap'
GATEWAY_CAPTURE_FILE = '/runtime/network/gateway.pcap'


class TLSModule(TestModule):
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
        capture_files=[MONITOR_CAPTURE_FILE,STARTUP_CAPTURE_FILE,GATEWAY_CAPTURE_FILE])

    # Generate results based on the state
    result_message = ''
    result_state = None
    #If any of the packetes detect failed client comms, fail the test
    if not client_results[0] and client_results[0] is not None:
      result_state = False
      result_message += client_results[1]
    else:
      if client_results[0]:
        result_state = True
        result_message += client_results[1] 
    return result_state, result_message

  def _resolve_device_ip(self):
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4()
