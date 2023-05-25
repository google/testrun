#!/usr/bin/env python3
"""Wrapper for the TestRun that simplifies
virtual testing procedure by allowing direct calling
from the command line.

Run using the provided command scripts in the cmd folder.
E.g sudo cmd/start
"""

import argparse
import sys
from testrun import TestRun
import logger
import signal

LOGGER = logger.get_logger("runner")


class TestRunner:
  """Controls and starts the Test Run application."""

  def __init__(self,
               config_file=None,
               validate=True,
               net_only=False,
               single_intf=False):
    self._register_exits()
    self.test_run = TestRun(config_file=config_file,
                            validate=validate,
                            net_only=net_only,
                            single_intf=single_intf)

  def _register_exits(self):
    signal.signal(signal.SIGINT, self._exit_handler)
    signal.signal(signal.SIGTERM, self._exit_handler)
    signal.signal(signal.SIGABRT, self._exit_handler)
    signal.signal(signal.SIGQUIT, self._exit_handler)

  def _exit_handler(self, signum, arg):  # pylint: disable=unused-argument
    LOGGER.debug("Exit signal received: " + str(signum))
    if signum in (2, signal.SIGTERM):
      LOGGER.info("Exit signal received.")
      # Kill all container services quickly
      # If we're here, we want everything to stop immediately
      # and don't care about a gracefully shutdown
      self._stop(True)
      sys.exit(1)

  def stop(self, kill=False):
    self.test_run.stop(kill)

  def start(self):
    self.test_run.start()
    LOGGER.info("Test Run has finished")


def parse_args():
  parser = argparse.ArgumentParser(
      description="Test Run",
      formatter_class=argparse.ArgumentDefaultsHelpFormatter)
  parser.add_argument(
      "-f",
      "--config-file",
      default=None,
      help="Define the configuration file for Test Run and Network Orchestrator"
  )
  parser.add_argument(
      "--no-validate",
      action="store_true",
      help="Turn off the validation of the network after network boot")
  parser.add_argument("-net",
                      "--net-only",
                      action="store_true",
                      help="Run the network only, do not run tests")
  parser.add_argument("--single-intf",
                      action="store_true",
                      help="Single interface mode (experimental)")
  parsed_args = parser.parse_known_args()[0]
  return parsed_args


if __name__ == "__main__":
  args = parse_args()
  runner = TestRunner(config_file=args.config_file,
                      validate=not args.no_validate,
                      net_only=args.net_only,
                      single_intf=args.single_intf)
  runner.start()
