"""Run NMAP module"""
import argparse
import signal
import sys
import logger

from nmap_module import NmapModule

LOGGER = logger.get_logger('test_module')


class NmapModuleRunner:
  """Run the NMAP module tests."""

  def __init__(self, module):

    signal.signal(signal.SIGINT, self._handler)
    signal.signal(signal.SIGTERM, self._handler)
    signal.signal(signal.SIGABRT, self._handler)
    signal.signal(signal.SIGQUIT, self._handler)

    LOGGER.info('Starting nmap Module')

    self._test_module = NmapModule(module)
    self._test_module.run_tests()

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
