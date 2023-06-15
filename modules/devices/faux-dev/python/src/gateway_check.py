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

"""Used to check if the Gateway server is functioning as expected"""

import logger
import util

LOGGER = None
LOG_NAME = 'gateway_validator'


class GatewayValidator:
  """Validates all expected test behaviors around the Gateway server"""

  def __init__(self, module):
    self._gateway = None
    self.default_gateway_test = False
    self.add_logger(module)

  def add_logger(self, module):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, module)

  def print_test_results(self):
    self.print_test_result('Default gateway test', self.default_gateway_test)

  def print_test_result(self, test_name, result):
    LOGGER.info(test_name + ': Pass' if result else test_name + ': Fail')

  def validate(self, dhcp_lease):
    self._gateway = dhcp_lease.gateway
    self.check_default_gateway()

  def check_default_gateway(self):
    LOGGER.info('Checking default gateway matches DHCP gateway: ' +
                self._gateway)
    cmd = '/testrun/bin/get_default_gateway'
    success, default_gateway = util.run_command(cmd, LOGGER)
    if success:
      LOGGER.info('Default gateway resolved: ' + default_gateway)
      if default_gateway == self._gateway:
        self.default_gateway_test = True
