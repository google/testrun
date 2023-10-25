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
RADVD server booted from the radvd-service file"""
from common import logger
from common import util

LOG_NAME = 'radvd'
LOGGER = None

class RADVDServer:
  """Represents the RADVD Server"""

  def __init__(self, enabled=True):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-1')
    self.enabled = enabled

  def restart(self):
    if not self.enabled:
      LOGGER.info('Cannot restart RADVD server, disabled')
      return False
    LOGGER.info('Restarting RADVD server')
    response = util.run_command('radvd-service restart', False)
    LOGGER.info('RADVD restarted: ' + str(response))
    return response

  def start(self):
    if not self.enabled:
      LOGGER.info('Cannot start RADVD server, disabled')
      return False
    LOGGER.info('Starting RADVD server')
    response = util.run_command('radvd-service start', False)
    LOGGER.info('RADVD started: ' + str(response))
    return response

  def stop(self):
    if not self.enabled:
      LOGGER.info('Cannot stop RADVD server, disabled')
      return False
    LOGGER.info('Stopping RADVD server')
    response = util.run_command('radvd-service stop', False)
    LOGGER.info('RADVD stopped: ' + str(response))
    return response

  def is_running(self):
    if not self.enabled:
      LOGGER.info('RADVD server disabled')
      return False
    LOGGER.info('Checking RADVD status')
    response = util.run_command('radvd-service status')
    running = response[0] == 'radvd service is running.'
    LOGGER.info('RADVD status: ' + str(running))
    return running
