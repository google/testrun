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
      return None, 'Could not resolve device IP address. Skipping'

  def _security_tls_v1_3_server(self):
    LOGGER.info('Running security.tls.v1_3_server')
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      return self._tls_util.validate_tls_server(self._device_ipv4_addr,
                                                tls_version='1.3')
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')
      return None, 'Could not resolve device IP address. Skipping'

  def _security_tls_v1_2_client(self):
    LOGGER.info('Running security.tls.v1_2_client')
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      return self._validate_tls_client(self._device_ipv4_addr, '1.2')
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')
      return None, 'Could not resolve device IP address. Skipping'

  def _security_tls_v1_3_client(self):
    LOGGER.info('Running security.tls.v1_3_client')
    self._resolve_device_ip()
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is not None:
      return self._validate_tls_client(self._device_ipv4_addr, '1.3')
    else:
      LOGGER.error('Could not resolve device IP address. Skipping')
      return None, 'Could not resolve device IP address. Skipping'

  def _validate_tls_client(self, client_ip, tls_version):
    monitor_result = self._tls_util.validate_tls_client(
        client_ip=client_ip,
        tls_version=tls_version,
        capture_file=MONITOR_CAPTURE_FILE)
    startup_result = self._tls_util.validate_tls_client(
        client_ip=client_ip,
        tls_version=tls_version,
        capture_file=STARTUP_CAPTURE_FILE)

    LOGGER.info('Montor: ' + str(monitor_result))
    LOGGER.info('Startup: ' + str(startup_result))

    if (not monitor_result[0] and monitor_result[0] is not None) or (
        not startup_result[0] and startup_result[0] is not None):
      result = False, startup_result[1] + monitor_result[1]
    elif monitor_result[0] and startup_result[0]:
      result = True, startup_result[1] + monitor_result[1]
    elif monitor_result[0] and startup_result[0] is None:
      result = True, monitor_result[1]
    elif startup_result[0] and monitor_result[0] is None:
      result = True, monitor_result[1]
    else:
      result = None, startup_result[1]
    return result

  def _resolve_device_ip(self):
    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
      self._device_ipv4_addr = self._get_device_ipv4()
