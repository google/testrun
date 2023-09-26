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
chronyd server booted from the chronyd.conf file"""
from common import logger
from common import util
import os

LOG_NAME = 'chronyd'
LOGGER = None
PID_FILE='/run/chrony/chronyd.pid'

class ChronydServer:
  """Represents the chronyd server"""

  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'ntp')

  def start(self):
    LOGGER.info('Starting chronyd server')
    response = util.run_command('chronyd', False)
    LOGGER.info('chronyd server started: ' + str(response))
    return response

  def stop(self):
    LOGGER.info('Stopping chronyd server')
    with open(PID_FILE, 'r', encoding='UTF-8') as f:
      pid = f.read()
    response = util.run_command(f'kill {pid}', False)
    LOGGER.info('chronyd server stopped: ' + str(response))
    return response

  def is_running(self):
    LOGGER.info('Checking chronyd server')
    running = os.path.exists(PID_FILE)
    LOGGER.info('chronyd server status: ' + str(running))
    return running