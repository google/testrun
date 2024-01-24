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

"""Run NMAP test module"""
import argparse
import signal
import sys
import logger

from nmap_module import NmapModule

LOG_NAME = 'nmap_runner'
LOGGER = logger.get_logger(LOG_NAME)

class NmapModuleRunner:
  """Run the NMAP module tests."""

  def __init__(self, module):

    signal.signal(signal.SIGINT, self._handler)
    signal.signal(signal.SIGTERM, self._handler)
    signal.signal(signal.SIGABRT, self._handler)
    signal.signal(signal.SIGQUIT, self._handler)
    self.add_logger(module)

    LOGGER.info('Starting nmap module')

    self._test_module = NmapModule(module)
    self._test_module.run_tests()
    self._test_module.generate_module_report()

    LOGGER.info('nmap test module finished')

  def add_logger(self, module):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, module)

  def _handler(self, signum):
    LOGGER.debug('SigtermEnum: ' + str(signal.SIGTERM))
    LOGGER.debug('Exit signal received: ' + str(signum))
    if signum in (2, signal.SIGTERM):
      LOGGER.info('Exit signal received. Stopping test module...')
      LOGGER.info('Test module stopped')
      sys.exit(1)


def run():
  parser = argparse.ArgumentParser(
      description='Nmap Module Help',
      formatter_class=argparse.ArgumentDefaultsHelpFormatter)

  parser.add_argument(
      '-m',
      '--module',
      help='Define the module name to be used to create the log file')

  args = parser.parse_args()

  # For some reason passing in the args from bash adds an extra
  # space before the argument so we'll just strip out extra space
  NmapModuleRunner(args.module.strip())


if __name__ == '__main__':
  run()
