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
"""Contains all the necessary classes to maintain the 
DHCP server"""
from common import logger
from common import util

CONFIG_FILE = '/etc/dhcp/dhcpd.conf'
LOG_NAME = 'radvd'
LOGGER = None


class RADVDServer:
  """Represents the RADVD Server"""

  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-2')

  def restart(self):
    LOGGER.info('Restarting RADVD Server')
    response = util.run_command('radvd-service restart', False)
    LOGGER.info('RADVD Restarted: ' + str(response))
    return response

  def start(self):
    LOGGER.info('Starting RADVD Server')
    response = util.run_command('radvd-service start', False)
    LOGGER.info('RADVD Started: ' + str(response))
    return response

  def stop(self):
    LOGGER.info('Stopping RADVD Server')
    response = util.run_command('radvd-service stop', False)
    LOGGER.info('RADVD Stopped: ' + str(response))
    return response

  def is_running(self):
    LOGGER.info('Checking RADVD Status')
    response = util.run_command('radvd-service status')
    LOGGER.info('RADVD Status: ' + str(response))
    return response[0] == 'radvd service is running.'
