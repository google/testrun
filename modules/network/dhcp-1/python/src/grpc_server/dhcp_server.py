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
import time
from common import logger
from common import util
from dhcp_config import DHCPConfig
from radvd_server import RADVDServer

CONFIG_FILE = '/etc/dhcp/dhcpd.conf'
LOG_NAME = 'dhcp_server'
LOGGER = None


class DHCPServer:
  """Represents the DHCP Server"""

  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-1')
    self.dhcp_config = DHCPConfig()
    self.radvd = RADVDServer()
    self.dhcp_config.resolve_config()

  def restart(self):
    LOGGER.info("Restarting DHCP Server")
    response = util.run_command("service isc-dhcp-server restart", False)
    LOGGER.info("DHCP Restarted: " + str(response))
    return response

  def start(self):
    LOGGER.info("Starting DHCP Server")
    response = util.run_command("service isc-dhcp-server start", False)
    LOGGER.info("DHCP Started: " + str(response))
    return response

  def stop(self):
    LOGGER.info("Stopping DHCP Server")
    response = util.run_command("service isc-dhcp-server stop", False)
    LOGGER.info("DHCP Stopped: " + str(response))

  def is_running(self):
    LOGGER.info("Checking DHCP Status")
    response = util.run_command("service isc-dhcp-server status")
    LOGGER.info("DHCP Status: " + str(response))
    return response[0] == 'Status of ISC DHCPv4 server: dhcpd is running.'

  def boot(self):
    LOGGER.info("Booting DHCP Server")
    isc_booted = False
    radvd_booted = False
    if self.is_running():
      LOGGER.info("Stopping isc-dhcp-server")
      stopped = self.stop()
      LOGGER.info("isc-dhcp-server stopped: " + str(stopped))

    if self.radvd.is_running():
      LOGGER.info("Stopping RADVD")
      stopped = self.radvd.stop()
      LOGGER.info("radvd stopped: " + str(stopped))

    LOGGER.info("Starting isc-dhcp-server")
    if self.start():
      isc_booted = self.is_running()
      LOGGER.info("isc-dhcp-server started: " + str(isc_booted))

    LOGGER.info("Starting RADVD")
    if self.radvd.start():
      radvd_booted = self.radvd.is_running()
      LOGGER.info("RADVD started: " + str(radvd_booted))

    return isc_booted and radvd_booted

def run():
  dhcp_server = DHCPServer()
  booted = dhcp_server.boot()

  if not booted:
    LOGGER.error('DHCP Server Failed to boot. Exiting')
    sys.exit(1)

  config = str(dhcp_server.dhcp_config)
  while True:
      dhcp_server.dhcp_config.resolve_config()
      new_config = str(dhcp_server.dhcp_config)
      if config != new_config:
        LOGGER.info("DHCP Config Changed")
        config = new_config
        success = dhcp_server.restart()
        success = dhcp_server.radvd.restart()
        time.sleep(1)

if __name__ == '__main__':
  run()
