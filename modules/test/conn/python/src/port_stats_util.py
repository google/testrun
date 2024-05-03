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
"""Module that contains various methods for validating the Port statistics """


class PortStatsUtil():
  """Helper class for various tests concerning Port behavior"""
  ETHTOOL_CONN_STATS_FILE = 'runtime/network/ethtool_conn_stats.txt'

  LOG_NAME = 'port_stats_util'
  LOGGER = None

  def __init__(self, logger, ethtool_conn_stats_file=ETHTOOL_CONN_STATS_FILE):
    self.ethtool_conn_stats_file = ethtool_conn_stats_file
    global LOGGER
    LOGGER = logger
    self.conn_stats = self._read_ethtool_conn_stats_file()

  def is_autonegotiate(self):
    auto_negotiation = False
    auto_negotiation_status = self._get_conn_stat_option('Auto-negotiation:')
    if auto_negotiation_status is not None:
      auto_negotiation = 'on' in auto_negotiation_status
    return auto_negotiation

  def connection_port_link_test(self):
    return None, '', ''

  def connection_port_duplex_test(self):
    auto_negotiation = self.is_autonegotiate()
    # Calculate final results
    result = None
    description = ''
    details = ''
    if not auto_negotiation:
      result = False
      description = 'Interface not configured for auto-negotiation'
    else:
      duplex = self._get_conn_stat_option('Duplex:')
      if 'Full' in duplex:
        result = True
        description = 'Succesfully auto-negotiated full duplex'
        details = f'Duplex negotiated: {duplex}'
      else:
        result = False
        description = 'Failed to auto-negotate full duplex'
        details = f'Duplex negotiated: {duplex}'
    return result, description, details

  def connection_port_speed_test(self):
    auto_negotiation = self.is_autonegotiate()
    # Calculate final results
    result = None
    description = ''
    details = ''
    if not auto_negotiation:
      result = False
      description = 'Interface not configured for auto-negotiation'
    else:
      speed = self._get_conn_stat_option('Speed:')
      if speed in ('100Mb/s', '1000Mb/s'):
        result = True
        description = 'Succesfully auto-negotiated speeds above 10 Mbps'
        details = f'Speed negotiated: {speed}'
      else:
        result = False
        description = 'Failed to auto-negotate speeds above 10 Mbps'
        details = f'Speed negotiated: {speed}'
    return result, description, details

  def _get_conn_stat_option(self, option):
    value = None
    """Extract the requested parameter from the ethtool result"""
    for line in self.conn_stats.split('\n'):
      #LOGGER.info(f'Checking option: {line}')
      if line.startswith(f'{option}'):
        value = line.split(':')[1].strip()
        break
    return value

  def _read_ethtool_conn_stats_file(self):
    with open(self.ethtool_conn_stats_file) as f:
      ethtool_results = f.read()
    #Cleanup the results for easier processing
    lines = ethtool_results.split('\n')
    cleaned_lines = [line.strip() for line in lines if line.strip()]
    recombined_text = '\n'.join(cleaned_lines)
    return recombined_text
