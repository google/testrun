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
"""NTP Server"""

from common import logger
from chronyd import ChronydServer
import time
LOGGER = None
LOG_NAME = 'ntp_server'

class NTPServer:
  """Represents the NTP server"""
  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'ntp')
    self._chronyd = ChronydServer()

  def start(self):
    return self._chronyd.start()

  def stop(self):
    return self._chronyd.stop()

  def is_running(self):
    return self._chronyd.is_running()

if __name__ == '__main__':
  ntp = NTPServer()
  ntp.start()
  # Give some time for the server to start
  running = False
  for _ in range(10):
    running = ntp.is_running()
    if running:
      break
    else:
      time.sleep(1)
  # Enter loop if ntp server is running
  if running:
    while True:
      time.sleep(1)
  else:
    LOGGER.info('NTP server failed to start')
