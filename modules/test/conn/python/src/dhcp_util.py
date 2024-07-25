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
"""Module that contains various methods for validating the DHCP 
device behaviors"""

import time
from datetime import datetime
import util
from dateutil import tz

LOG_NAME = 'dhcp_util'
LOGGER = None


class DHCPUtil():
  """Helper class for various tests concerning DHCP behavior"""

  def __init__(self, dhcp_primary_client, dhcp_secondary_client, logger):
    global LOGGER
    LOGGER = logger
    self._dhcp1_client = dhcp_primary_client
    self._dhcp2_client = dhcp_secondary_client

  # Move primary DHCP server from failover into a single DHCP server config
  def disable_failover(self, dhcp_server_primary=True):
    LOGGER.info('Disabling primary DHCP server failover')
    response = self.get_dhcp_client(dhcp_server_primary).disable_failover()
    if response.code == 200:
      LOGGER.info('Primary DHCP server failover disabled')
      return True
    else:
      LOGGER.error('Failed to disable primary DHCP server failover')
    return False

  # Move primary DHCP server to primary failover
  def enable_failover(self, dhcp_server_primary=True):
    LOGGER.info('Enabling primary failover DHCP server')
    response = self.get_dhcp_client(dhcp_server_primary).enable_failover()
    if response.code == 200:
      LOGGER.info('Primary DHCP server failover enabled')
      return True
    else:
      LOGGER.error('Failed to enable primary DHCP server failover')
      return False

  # Resolve the requested dhcp client
  def get_dhcp_client(self, dhcp_server_primary=True):
    if dhcp_server_primary:
      return self._dhcp1_client
    else:
      return self._dhcp2_client

  # Read the DHCP range
  def get_dhcp_range(self, dhcp_server_primary=True):
    response = self.get_dhcp_client(dhcp_server_primary).get_dhcp_range()
    cur_range = None
    if response.code == 200:
      cur_range = {}
      cur_range['start'] = response.start
      cur_range['end'] = response.end
      LOGGER.info('Current DHCP subnet range: ' + str(cur_range))
    else:
      LOGGER.error('Failed to resolve current subnet range required '
                   'for restoring network')
    return cur_range

  def restore_failover_dhcp_server(self):
    if self.enable_failover():
      response = self.get_dhcp_client(False).start_dhcp_server()
      if response.code == 200:
        LOGGER.info('Secondary DHCP server started')
        return True
      else:
        LOGGER.error('Failed to start secondary DHCP server')
        return False
    else:
      LOGGER.error('Failed to enabled failover in primary DHCP server')
      return False

  # Resolve the requested dhcp client
  def start_dhcp_server(self, dhcp_server_primary=True):
    LOGGER.info('Starting DHCP server')
    response = self.get_dhcp_client(dhcp_server_primary).start_dhcp_server()
    if response.code == 200:
      LOGGER.info('DHCP server start command success')
      return True
    else:
      LOGGER.error('DHCP server start command failed')
      return False

  # Resolve the requested dhcp client
  def stop_dhcp_server(self, dhcp_server_primary=True):
    LOGGER.info('Stopping DHCP server')
    response = self.get_dhcp_client(dhcp_server_primary).stop_dhcp_server()
    if response.code == 200:
      LOGGER.info('DHCP server stop command success')
      return True
    else:
      LOGGER.error('DHCP server stop command failed')
      return False

  def get_dhcp_server_status(self, dhcp_server_primary=True):
    server_name = 'primary' if dhcp_server_primary else 'secondary'
    LOGGER.debug(f'Checking {server_name} DHCP server status')
    response = self.get_dhcp_client(dhcp_server_primary).get_status()
    if response.code == 200:
      LOGGER.debug(f'DHCP {server_name} server status: {response.message}')
      status = eval(response.message)  # pylint: disable=W0123
      return status['dhcpStatus']
    else:
      return False

  def get_cur_lease(self, mac_address, timeout):
    """
      Retrieve the current lease for a given MAC address with retries.

      Args:
          mac_address (str): The MAC address of the client whose 
                             lease is being queried.
          timeout (int): The maximum time (in seconds) to wait 
                         for a lease to be found.

      Returns:
          str or None: The lease information as a string if found, 
                       or None if no lease is found within the timeout.

      Note:
          This method will attempt to query both primary and secondary 
          DHCP servers for the lease, with a 5-second pause between 
          retries until the `timeout` is reached.
      """
    LOGGER.info('Resolving current lease with max wait time of ' +
                str(timeout) + ' seconds')
    start_time = time.time()

    while True:
      lease = self._get_cur_lease(mac_address)
      if lease is not None or (time.time() - start_time) >= timeout:
        return lease
      time.sleep(5)

  def _get_cur_lease(self, mac_address):
    """
    Retrieve the current lease for a given MAC address from both
    primary and secondary DHCP servers.

    Args:
        mac_address (str): The MAC address of the client whose
                           lease is being queried.

    Returns:
        str or None: The lease information as a string if found,
                     or None if no lease is found.
    """
    primary = False
    lease = self._get_cur_lease_from_server(mac_address=mac_address,
                                            dhcp_server_primary=True)
    if lease is not None:
      primary = True
    else:
      lease = self._get_cur_lease_from_server(mac_address=mac_address,
                                              dhcp_server_primary=False)
    if lease is not None:
      lease['primary'] = primary
      log_msg = 'DHCP lease resolved from '
      log_msg += 'primary' if lease['primary'] else 'secondary'
      log_msg += ' server'
      LOGGER.info(log_msg)
      LOGGER.info('DHCP Lease resolved:\n' + str(lease))
    return lease

  def _get_cur_lease_from_server(self, mac_address, dhcp_server_primary=True):
    lease = None
    # Check if the server is online first, old lease files can still return
    # lease information that is no longer valid when a dhcp server is shutdown
    if self.get_dhcp_server_status(dhcp_server_primary):
      response = self.get_dhcp_client(dhcp_server_primary).get_lease(
          mac_address)
      if response.code == 200:
        lease_resp = eval(response.message)  # pylint: disable=W0123
        if lease_resp:  # Check if non-empty lease
          lease = lease_resp
    return lease

  def is_lease_active(self, lease):
    if 'ip' in lease:
      ip_addr = lease['ip']
      LOGGER.info('Lease IP Resolved: ' + ip_addr)
      LOGGER.info('Attempting to ping device...')
      ping_success = self.ping(ip_addr)
      LOGGER.info('Ping Success: ' + str(ping_success))
      LOGGER.info('Current lease confirmed active in device')
    else:
      LOGGER.error('Failed to confirm a valid active lease for the device')
    return ping_success

  def ping(self, host):
    cmd = 'ping -c 1 ' + str(host)
    success = util.run_command(cmd, output=False) # pylint: disable=E1120
    return success

  def add_reserved_lease(self,
                         hostname,
                         mac_address,
                         ip_address,
                         dhcp_server_primary=True):
    response = self.get_dhcp_client(dhcp_server_primary).add_reserved_lease(
        hostname, mac_address, ip_address)
    if response.code == 200:
      LOGGER.info('Reserved lease ' + ip_address + ' added for ' + mac_address)
      return True
    else:
      LOGGER.error('Failed to add reserved lease for ' + mac_address)
      return False

  def delete_reserved_lease(self, mac_address, dhcp_server_primary=True):
    response = self.get_dhcp_client(dhcp_server_primary).delete_reserved_lease(
        mac_address)
    if response.code == 200:
      LOGGER.info('Reserved lease deleted for ' + mac_address)
      return True
    else:
      LOGGER.error('Failed to delete reserved lease for ' + mac_address)
      return False

  def setup_single_dhcp_server(self):
    # Shutdown the secondary DHCP Server
    LOGGER.info('Stopping secondary DHCP server')
    if self.stop_dhcp_server(False):
      LOGGER.info('Secondary DHCP server stop command success')
      time.sleep(3)  # Give some time for the server to stop
      if not self.get_dhcp_server_status(False):
        LOGGER.info('Secondary DHCP server stopped')
        if self.disable_failover(True):
          LOGGER.info('Primary DHCP server failover disabled')
          return True
        else:
          LOGGER.error('Failed to disable primary DHCP server failover')
          return False
      else:
        LOGGER.error('Secondary DHCP server still running')
        return False
    else:
      LOGGER.error('Failed to stop secondary DHCP server')
      return False

  def wait_for_lease_expire(self, lease, max_wait_time=30):
    expiration_utc = datetime.strptime(lease['expires'], '%Y-%m-%d %H:%M:%S')
    # lease information stored in UTC so we need to convert to local time
    expiration = self.utc_to_local(expiration_utc)
    time_to_expire = expiration - datetime.now(tz=tz.tzlocal())
    # Wait until the expiration time and padd 5 seconds
    # If wait time is longer than max_wait_time, only wait
    # for the max wait time
    wait_time = min(max_wait_time,
                    time_to_expire.total_seconds() +
                    5) if time_to_expire.total_seconds() > 0 else 0
    LOGGER.info('Time until lease expiration: ' + str(wait_time))
    LOGGER.info('Waiting for current lease to expire: ' + str(expiration))
    if wait_time > 0:
      time.sleep(wait_time)
    LOGGER.info('Current lease expired.')

  # Convert from a UTC datetime to the local time zone
  def utc_to_local(self, utc_datetime):
    # Set the time zone for the UTC datetime
    utc = utc_datetime.replace(tzinfo=tz.tzutc())

    # Convert to local time zone
    local_datetime = utc.astimezone(tz.tzlocal())

    return local_datetime
