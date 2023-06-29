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
"""Used to resolve the DHCP servers lease information"""

import os
import sys
from dhcp_lease import DHCPLease

# Add the parent directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

import logger
from common import util

LOG_NAME = "dhcp_lease"
LOGGER = None

DHCP_LEASE_FILES = [
    "/var/lib/dhcp/dhcpd.leases", "/var/lib/dhcp/dhcpd.leases~",
    "/var/lib/dhcp/dhcpd6.leases", "/var/lib/dhcp/dhcpd6.leases~"
]
DHCP_CONFIG_FILE = '/etc/dhcp/dhcpd.conf'

class DHCPLeases:
  """Leases for the DHCP server"""

  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-1')

  def delete_all_hosts(self):
    LOGGER.info("Deleting hosts")
    for lease in DHCP_LEASE_FILES:
      LOGGER.info("Checking file: " + lease)
      if os.path.exists(lease):
        LOGGER.info("File Exists: " + lease)
        try:
          # Delete existing lease file
          os.remove(lease)
        except OSError as e:
          LOGGER.info(f"Error occurred while deleting the file: {e}")
        # Create an empty lease file
        with open(lease,'w'):
          pass

  def get_lease(self,hw_addr):
    for lease in self.get_leases():
      if lease.hw_addr == hw_addr:
        return lease

  def get_leases(self):
    leases = []
    lease_list_raw = self._get_lease_list()
    LOGGER.info('Raw Leases:\n' + str(lease_list_raw) + "\n")
    lines = lease_list_raw.split(
        '==============================================================================================='
    )[1].split('\n')
    for line in lines:
      try:
        lease = DHCPLease(line)
        leases.append(lease)
      except Exception as e:
        # Let non lease lines file without extra checks
        LOGGER.error("Making Lease Error: " + str(e))
        LOGGER.error("Not a valid lease line: " + line)
    return leases

  def delete_lease(self,ip_addr):
    LOGGER.info("Deleting lease")
    for lease in DHCP_LEASE_FILES:
      LOGGER.info("Checking file: " + lease)
      if os.path.exists(lease):
        LOGGER.info("File Exists: " + lease)
        try:
          # Delete existing lease file
          with (open(lease,'r')) as f:
            contents = f.read()

          while ip_addr in contents:
            ixIp = contents.find(ip_addr)
            leaseStart = contents.rindex("lease",0,ixIp)
            leaseEnd = contents.find("}",leaseStart)
            LOGGER.info("Lease Location: " + str(leaseStart)+":"+str(leaseEnd))
            contents = contents[0:leaseStart] + contents[leaseEnd+1:]

        except OSError as e:
          LOGGER.info(f"Error occurred while deleting the lease: {e}")


  def _get_lease_list(self):
    LOGGER.info('Running lease list command')
    try:
      stdout, stderr = util.run_command('dhcp-lease-list')
      return stdout
    except Exception as e:
      LOGGER.error("Error lease list: " + str(e))

  def _write_config(self,config):
    with open(DHCP_CONFIG_FILE,"w") as f:
      f.write(config)