"""Used to check if the DHCP server is functioning as expected"""

import time
import logger

LOGGER = None
LOG_NAME = 'dhcp_validator'
DHCP_LEASE_FILE = '/var/lib/dhcp/dhclient.leases'
IP_ADDRESS_KEY = 'fixed-address'
DNS_OPTION_KEY = 'option domain-name-servers'
GATEWAY_OPTION_KEY = 'option routers'
NTP_OPTION_KEY = 'option ntp-servers'


class DHCPValidator:
  """Validates all expected test behaviors around the DHCP server"""

  def __init__(self, module):
    self._dhcp_lease = None
    self.dhcp_lease_test = False
    self.add_logger(module)

  def add_logger(self, module):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, module)

  def print_test_results(self):
    self.print_test_result('DHCP lease test', self.dhcp_lease_test)

  def print_test_result(self, test_name, result):
    LOGGER.info(test_name + ': Pass' if result else test_name + ': Fail')

  def get_dhcp_lease(self):
    """Returns the current DHCP lease."""
    return self._dhcp_lease

  def validate(self):
    self._resolve_dhcp_lease()
    LOGGER.info('IP Addr: ' + self._dhcp_lease.ip_addr)
    LOGGER.info('Gateway: ' + self._dhcp_lease.gateway)
    LOGGER.info('DNS Server: ' + self._dhcp_lease.dns_server)
    LOGGER.info('NTP Server: ' + self._dhcp_lease.ntp_server)

  def _resolve_dhcp_lease(self):
    LOGGER.info('Resolving DHCP lease...')
    while self._dhcp_lease is None:
      time.sleep(5)
      try:
        with open(DHCP_LEASE_FILE, 'r', encoding='UTF-8') as lease_file:
          lines = lease_file.read()
        LOGGER.debug('Lease file:\n' + lines)
        leases = lines.split('lease ')
        # Last lease is the current lease
        cur_lease = leases[-1]
        if cur_lease is not None:
          LOGGER.debug('Current lease: ' + cur_lease)
          self._dhcp_lease = DHCPLease()
          self.dhcp_lease_test = True
          # Iterate over entire lease and pick the parts we care about
          lease_parts = cur_lease.split('\n')
          for part in lease_parts:
            part_clean = part.strip()
            if part_clean.startswith(IP_ADDRESS_KEY):
              self._dhcp_lease.ip_addr = part_clean[len(IP_ADDRESS_KEY
                                                        ):-1].strip()
            elif part_clean.startswith(DNS_OPTION_KEY):
              self._dhcp_lease.dns_server = part_clean[len(DNS_OPTION_KEY
                                                           ):-1].strip()
            elif part_clean.startswith(GATEWAY_OPTION_KEY):
              self._dhcp_lease.gateway = part_clean[len(GATEWAY_OPTION_KEY
                                                        ):-1].strip()
            elif part_clean.startswith(NTP_OPTION_KEY):
              self._dhcp_lease.ntp_server = part_clean[len(NTP_OPTION_KEY
                                                           ):-1].strip()
      except Exception:  # pylint: disable=broad-exception-caught
        LOGGER.error('DHCP Resolved Error')
    LOGGER.info('DHCP lease resolved')


class DHCPLease:
  """Stores information about a device's DHCP lease."""

  def __init__(self):
    self.ip_addr = None
    self.gateway = None
    self.dns_server = None
    self.ntp_server = None
