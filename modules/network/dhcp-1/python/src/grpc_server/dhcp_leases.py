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
from dhcp_lease import DHCPLease
import logger
from common import util

LOG_NAME = 'dhcp_lease'
LOGGER = None

DHCP_LEASE_FILES = [
    '/var/lib/dhcp/dhcpd.leases', '/var/lib/dhcp/dhcpd.leases~',
    '/var/lib/dhcp/dhcpd6.leases', '/var/lib/dhcp/dhcpd6.leases~'
]
DHCP_CONFIG_FILE = '/etc/dhcp/dhcpd.conf'


class DHCPLeases:
  """Leases for the DHCP server"""

  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-1')

  def delete_all_hosts(self):
    LOGGER.info('Deleting hosts')
    for lease in DHCP_LEASE_FILES:
      LOGGER.info('Checking file: ' + lease)
      if os.path.exists(lease):
        LOGGER.info('File Exists: ' + lease)
        try:
          # Delete existing lease file
          os.remove(lease)
        except OSError as e:
          LOGGER.info(f'Error occurred while deleting the file: {e}')
        # Create an empty lease file
        with open(lease, 'w', encoding='UTF-8'):
          pass

  def get_lease(self, hw_addr):
    for lease in self.get_leases():
      if lease.hw_addr == hw_addr:
        return lease

  def get_leases(self):
    leases = []
    lease_list_raw = self._get_lease_list()
    LOGGER.info('Raw Leases:\n' + str(lease_list_raw) + '\n')
    lease_list_start = lease_list_raw.find('=========', 0)
    lease_list_start = lease_list_raw.find('\n', lease_list_start)
    lease_list = lease_list_raw[lease_list_start + 1:]
    lines = lease_list.split('\n')
    for line in lines:
      try:
        lease = DHCPLease(line)
        leases.append(lease)
      except Exception as e:  # pylint: disable=W0718
        # Let non lease lines file without extra checks
        LOGGER.error('Making Lease Error: ' + str(e))
        LOGGER.error('Not a valid lease line: ' + line)
    return leases

  def delete_lease(self, ip_addr):
    LOGGER.info('Deleting lease')
    for lease in DHCP_LEASE_FILES:
      LOGGER.info('Checking file: ' + lease)
      if os.path.exists(lease):
        LOGGER.info('File Exists: ' + lease)
        try:
          # Delete existing lease file
          with (open(lease, 'r', encoding='UTF-8')) as f:
            contents = f.read()

          while ip_addr in contents:
            ix_ip = contents.find(ip_addr)
            lease_start = contents.rindex('lease', 0, ix_ip)
            lease_end = contents.find('}', lease_start)
            LOGGER.info('Lease Location: ' + str(lease_start) + ':' +
                        str(lease_end))
            contents = contents[0:lease_start] + contents[lease_end + 1:]

        except OSError as e:
          LOGGER.info(f'Error occurred while deleting the lease: {e}')

  def _get_lease_list(self):
    LOGGER.info('Running lease list command')
    try:
      result = util.run_command('dhcp-lease-list')
      return result[0]
    except Exception as e:  # pylint: disable=W0718
      LOGGER.error('Error lease list: ' + str(e))

  def _write_config(self, config):
    with open(DHCP_CONFIG_FILE, 'w', encoding='UTF-8') as f:
      f.write(config)
