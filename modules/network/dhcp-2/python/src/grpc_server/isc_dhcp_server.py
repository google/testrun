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
isc-dhcp server booted from the isc-dhcp service file"""
from common import logger
from common import util

LOG_NAME = 'isc-dhcp'
LOGGER = None

class ISCDHCPServer:
  """Represents the isc-dhcp server"""

  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-2')

  def restart(self):
    LOGGER.info('Restarting isc-dhcp server')
    response = util.run_command('isc-dhcp-service restart', False)
    LOGGER.info('isc-dhcp server restarted: ' + str(response))
    return response

  def start(self):
    LOGGER.info('Starting isc-dhcp server')
    response = util.run_command('isc-dhcp-service start', False)
    LOGGER.info('isc-dhcp server started: ' + str(response))
    return response

  def stop(self):
    LOGGER.info('Stopping isc-dhcp server')
    response = util.run_command('isc-dhcp-service stop', False)
    LOGGER.info('isc-dhcp server stopped: ' + str(response))
    return response

  def is_running(self):
    LOGGER.info('Checking isc-dhcp server')
    response = util.run_command('isc-dhcp-service status')
    running = response[0] == 'isc-dhcp service is running.'
    LOGGER.info('isc-dhcp server status: ' + str(running))
    return running
