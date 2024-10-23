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

import os

ETHTOOL_CONN_STATS_FILE = 'runtime/network/ethtool_conn_stats.txt'
ETHTOOL_PORT_STATS_PRE_FILE = (
    'runtime/network/ethtool_port_stats_pre_monitor.txt')
ETHTOOL_PORT_STATS_POST_FILE = (
    'runtime/network/ethtool_port_stats_post_monitor.txt')

LOG_NAME = 'port_stats_util'
LOGGER = None


class PortStatsUtil():
  """Helper class for various tests concerning Port behavior"""

  def __init__(self,
               logger,
               ethtool_conn_stats_file=ETHTOOL_CONN_STATS_FILE,
               ethtool_port_stats_pre_file=ETHTOOL_PORT_STATS_PRE_FILE,
               ethtool_port_stats_post_file=ETHTOOL_PORT_STATS_POST_FILE):
    self.ethtool_conn_stats_file = ethtool_conn_stats_file
    self.ethtool_port_stats_pre_file = ethtool_port_stats_pre_file
    self.ethtool_port_stats_post_file = ethtool_port_stats_post_file
    global LOGGER
    LOGGER = logger
    self.conn_stats = self._read_stats_file(self.ethtool_conn_stats_file)

  def is_autonegotiate(self):
    auto_negotiation = None
    auto_negotiation_status = self._get_stat_option(stats=self.conn_stats,
                                                    option='Auto-negotiation:')
    if auto_negotiation_status is not None:
      auto_negotiation = 'on' in auto_negotiation_status
    return auto_negotiation

  def connection_port_link_test(self):
    stats_pre = self._read_stats_file(self.ethtool_port_stats_pre_file)
    stats_post = self._read_stats_file(self.ethtool_port_stats_post_file)
    result = None
    description = ''
    details = ''
    if stats_pre is None or stats_pre is None:
      result = 'Error'
      description = 'Port stats not available'
    else:
      tx_errors_pre = self._get_stat_option(stats=stats_pre,
                                            option='tx_errors:')
      tx_errors_post = self._get_stat_option(stats=stats_post,
                                             option='tx_errors:')
      rx_errors_pre = self._get_stat_option(stats=stats_pre,
                                            option='rx_errors:')
      rx_errors_post = self._get_stat_option(stats=stats_post,
                                             option='rx_errors:')

      # Check that the above have been resolved correctly
      if (tx_errors_pre is None or tx_errors_post is None or
        rx_errors_pre is None or rx_errors_post is None):
        result = 'Error'
        description = 'Port stats not available'
      else:
        tx_errors = int(tx_errors_post) - int(tx_errors_pre)
        rx_errors = int(rx_errors_post) - int(rx_errors_pre)
        if tx_errors > 0 or rx_errors > 0:
          result = False
          description = 'Port errors detected'
          details = f'TX errors: {tx_errors}, RX errors: {rx_errors}'
        else:
          result = True
          description = 'No port errors detected'
    return result, description, details

  def connection_port_duplex_test(self):
    auto_negotiation = self.is_autonegotiate()
    # Calculate final results
    result = None
    description = ''
    details = ''
    if auto_negotiation is None:
      result = 'Error'
      description = 'Port stats not available'
    elif not auto_negotiation:
      result = False
      description = 'Interface not configured for auto-negotiation'
    else:
      duplex = self._get_stat_option(stats=self.conn_stats, option='Duplex:')
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
    if auto_negotiation is None:
      result = 'Error'
      description = 'Port stats not available'
    elif not auto_negotiation:
      result = False
      description = 'Interface not configured for auto-negotiation'
    else:
      speed = self._get_stat_option(stats=self.conn_stats, option='Speed:')
      if speed in ('100Mb/s', '1000Mb/s'):
        result = True
        description = 'Succesfully auto-negotiated speeds above 10 Mbps'
        details = f'Speed negotiated: {speed}'
      else:
        result = False
        description = 'Failed to auto-negotate speeds above 10 Mbps'
        details = f'Speed negotiated: {speed}'
    return result, description, details

  def _get_stat_option(self, stats, option):
    """Extract the requested parameter from the ethtool result"""
    value = None
    for line in stats.split('\n'):
      #LOGGER.info(f'Checking option: {line}')
      if line.startswith(f'{option}'):
        value = line.split(':')[1].strip()
        break
    return value

  def _read_stats_file(self, file):
    if os.path.isfile(file):
      with open(file, encoding='utf-8') as f:
        content = f.read()
      # Cleanup the results for easier processing
      lines = content.split('\n')
      cleaned_lines = [line.strip() for line in lines if line.strip()]
      recombined_text = '\n'.join(cleaned_lines)
      return recombined_text
    return None
