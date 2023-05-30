"""Used to run all the various validator modules for the faux-device"""

import argparse
import json
import os
import signal
import sys

import logger
from dns_check import DNSValidator
from dhcp_check import DHCPValidator
from gateway_check import GatewayValidator
from ntp_check import NTPValidator

RESULTS_DIR = '/runtime/validation/'
LOGGER = logger.get_logger('validator')


class FauxDevice:
  """Represents a virtual testing device."""

  def __init__(self, module):

    signal.signal(signal.SIGINT, self._handler)
    signal.signal(signal.SIGTERM, self._handler)
    signal.signal(signal.SIGABRT, self._handler)
    signal.signal(signal.SIGQUIT, self._handler)

    self.dhcp_validator = DHCPValidator(module)
    self.dns_validator = DNSValidator(module)
    self.gateway_validator = GatewayValidator(module)
    self.ntp_validator = NTPValidator(module)

    self._module = module
    self.run_tests()
    results = self.generate_results()
    self.write_results(results)

  def run_tests(self):
    """Execute configured network tests."""

    # Run DHCP tests first since everything hinges
    # on basic DHCP compliance first
    self.dhcp_validator.validate()

    dhcp_lease = self.dhcp_validator.get_dhcp_lease()

    # Use current lease from dhcp tests to validate DNS behaviors
    self.dns_validator.validate(dhcp_lease)

    # Use current lease from dhcp tests to validate default gateway
    self.gateway_validator.validate(dhcp_lease)

    # Use current lease from dhcp tests to validate ntp server
    self.ntp_validator.validate(dhcp_lease)

  def print_test_results(self):
    """Print test results to log."""
    self.dhcp_validator.print_test_results()
    self.dns_validator.print_test_results()
    self.gateway_validator.print_test_results()
    self.ntp_validator.print_test_results()

  def generate_results(self):
    """Transform test results into JSON format."""

    results = []
    results.append(
        self.generate_result('dhcp_lease', self.dhcp_validator.dhcp_lease_test))
    results.append(
        self.generate_result('dns_from_dhcp',
                             self.dns_validator.dns_dhcp_server_test))
    results.append(
        self.generate_result('dns_resolution',
                             self.dns_validator.dns_resolution_test))
    results.append(
        self.generate_result('gateway_default',
                             self.gateway_validator.default_gateway_test))
    results.append(
        self.generate_result('ntp_sync', self.ntp_validator.ntp_sync_test))
    json_results = json.dumps({'results': results}, indent=2)

    return json_results

  def write_results(self, results):
    """Write test results to file."""
    results_file = os.path.join(RESULTS_DIR, 'result.json')
    LOGGER.info('Writing results to ' + results_file)
    with open(results_file, 'w', encoding='utf-8') as f:
      f.write(results)

  def generate_result(self, test_name, test_result):
    """Return JSON object for test result."""
    if test_result is not None:
      result = 'compliant' if test_result else 'non-compliant'
    else:
      result = 'skipped'
    LOGGER.info(test_name + ': ' + result)
    res_dict = {'name': test_name, 'result': result}
    return res_dict

  def _handler(self, signum, frame):  # pylint: disable=unused-argument
    if signum in (2, signal.SIGTERM):
      sys.exit(1)


def run(argv):  # pylint: disable=unused-argument
  """Run the network validator."""
  parser = argparse.ArgumentParser(
      description='Faux Device _validator',
      formatter_class=argparse.ArgumentDefaultsHelpFormatter)
  parser.add_argument(
      '-m',
      '--module',
      help='Define the module name to be used to create the log file')

  args = parser.parse_args()

  # For some reason passing in the args from bash adds an extra
  # space before the argument so we'll just strip out extra space
  FauxDevice(args.module.strip())


if __name__ == '__main__':
  run(sys.argv)
