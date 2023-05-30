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

"""Authenticator for the RADIUS Server"""
from chewie.chewie import Chewie
import logging

_LOG_FORMAT = '%(asctime)s %(name)-8s %(levelname)-7s %(message)s'
_DATE_FORMAT = '%b %02d %H:%M:%S'
INTERFACE_NAME = 'veth0'
RADIUS_SERVER_IP = '127.0.0.1'
RADIUS_SERVER_PORT = 1812
RADIUS_SERVER_SECRET = 'testing123'


class Authenticator():
  """Authenticator for the RADIUS Server"""
  def __init__(self):
    self.chewie = Chewie(INTERFACE_NAME,
                         self._get_logger(),
                         self._auth_handler,
                         self._failure_handler,
                         self._logoff_handler,
                         radius_server_ip=RADIUS_SERVER_IP,
                         radius_server_port=RADIUS_SERVER_PORT,
                         radius_server_secret=RADIUS_SERVER_SECRET)
    self.chewie.run()

  def _get_logger(self):
    logging.basicConfig(format=_LOG_FORMAT,
                        datefmt=_DATE_FORMAT,
                        level=logging.INFO)
    logger = logging.getLogger('chewie')
    return logger

  def _auth_handler(self, address, group_address, *args, **kwargs): # pylint: disable=unused-argument
    print('Successful auth for ' + str(address) + ' on port '+
          str(group_address))

  def _failure_handler(self, address, group_address):
    print('Failed auth for ' + str(address) + ' on port ' + str(group_address))

  def _logoff_handler(self, address, group_address):
    print('Log off reported for ' + str(address) + ' on port ' +
          str(group_address))


authenticator = Authenticator()
