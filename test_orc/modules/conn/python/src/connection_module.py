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

"""Connection test module"""
import util
import sys
from test_module import TestModule

LOG_NAME = "test_connection"
LOGGER = None


class ConnectionModule(TestModule):
  """Connection Test module"""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    global LOGGER
    LOGGER = self._get_logger()

  def _connection_target_ping(self):
    LOGGER.info("Running connection.target_ping")

    # If the ipv4 address wasn't resolved yet, try again
    if self._device_ipv4_addr is None:
       self._device_ipv4_addr = self._get_device_ipv4(self)

    if self._device_ipv4_addr is None:
      LOGGER.error("No device IP could be resolved")
      sys.exit(1)
    else:
      return self._ping(self._device_ipv4_addr)


  def _ping(self, host):
    cmd = 'ping -c 1 ' + str(host)
    success = util.run_command(cmd, output=False)
    return success