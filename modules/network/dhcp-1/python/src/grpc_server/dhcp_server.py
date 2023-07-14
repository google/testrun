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
import sys
import time
from common import logger
from dhcp_config import DHCPConfig
from radvd_server import RADVDServer
from isc_dhcp_server import ISCDHCPServer

LOG_NAME = 'dhcp_server'
LOGGER = None

class DHCPServer:
  """Represents the DHCP Server"""

  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-1')
    self.dhcp_config = DHCPConfig()
    self.radvd = RADVDServer()
    self.isc_dhcp = ISCDHCPServer()
    self.dhcp_config.resolve_config()

  def restart(self):
    LOGGER.info('Restarting DHCP server')
    isc_started = self.isc_dhcp.restart()
    radvd_started = self.radvd.restart()
    started = isc_started and radvd_started
    LOGGER.info('DHCP server restarted: ' + str(started))
    return started

  def start(self):
    LOGGER.info('Starting DHCP server')
    isc_started = self.isc_dhcp.start()
    radvd_started = self.radvd.start()
    started = isc_started and radvd_started
    LOGGER.info('DHCP server started: ' + str(started))
    return started

  def stop(self):
    LOGGER.info('Stopping DHCP server')
    isc_stopped = self.isc_dhcp.stop()
    radvd_stopped = self.radvd.stop()
    stopped = isc_stopped and radvd_stopped
    LOGGER.info('DHCP server stopped: ' + str(stopped))
    return stopped

  def is_running(self):
    LOGGER.info('Checking DHCP server status')
    isc_running = self.isc_dhcp.is_running()
    radvd_running = self.radvd.is_running()
    running = isc_running and radvd_running
    LOGGER.info('DHCP server status: ' + str(running))
    return running

  def boot(self):
    LOGGER.info('Booting DHCP server')
    booted = False
    if self.is_running():
      LOGGER.info('Stopping DHCP server')
      stopped = self.stop()
      LOGGER.info('DHCP server stopped: ' + str(stopped))
    if self.start():
      # Scan for 5 seconds if not yet ready
      for _ in range(5):
        time.sleep(1)
        booted = self.is_running()
        if booted:
          break
      LOGGER.info('DHCP server booted: ' + str(booted))
    return booted


def run():
  dhcp_server = DHCPServer()
  booted = dhcp_server.boot()

  if not booted:
    LOGGER.error('DHCP server failed to boot. Exiting')
    sys.exit(1)

  config = str(dhcp_server.dhcp_config)
  while True:
    dhcp_server.dhcp_config.resolve_config()
    new_config = str(dhcp_server.dhcp_config)
    if config != new_config:
      LOGGER.info('DHCP server config changed')
      config = new_config
      dhcp_server.restart()
      dhcp_server.radvd.restart()
      time.sleep(1)

if __name__ == '__main__':
  run()
