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
"""Wrapper for the Testrun that simplifies
virtual testing procedure by allowing direct calling
from the command line.

Run using the provided command scripts in the cmd folder.
E.g sudo cmd/start
"""

# Disable warning about TripleDES being removed from cryptography in 48.0.0
# Scapy 2.5.0 uses TripleDES
# Scapy 2.6.0 causes a bug in testrun when the device intf is being restarted
import warnings
from cryptography.utils import CryptographyDeprecationWarning
warnings.filterwarnings("ignore", category=CryptographyDeprecationWarning)

# pylint: disable=wrong-import-position
import argparse
import sys
from testrun import Testrun
from common import logger
import signal
import io

LOGGER = logger.get_logger("runner")


class TestRunner:
  """Controls and starts the Test Run application."""

  def __init__(self,
               config_file=None,
               validate=False,
               net_only=False,
               single_intf=False,
               no_ui=False,
               target=None,
               firmware=None):
    self._register_exits()
    self._testrun = Testrun(config_file=config_file,
                            validate=validate,
                            net_only=net_only,
                            single_intf=single_intf,
                            no_ui=no_ui,
                            target_mac=target,
                            firmware=firmware)

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

  def stop(self):
    self._testrun.stop()


def parse_args():
  parser = argparse.ArgumentParser(
      description="Testrun",
      formatter_class=argparse.ArgumentDefaultsHelpFormatter)
  parser.add_argument(
      "-f",
      "--config-file",
      default=None,
      help="Define the configuration file for Testrun and Network Orchestrator")
  parser.add_argument(
      "--validate",
      default=False,
      action="store_true",
      help="Turn on the validation of the network after network boot")
  parser.add_argument("-net",
                      "--net-only",
                      action="store_true",
                      help="Run the network only, do not run tests")
  parser.add_argument("--single-intf",
                      action="store_true",
                      help="Single interface mode (experimental)")
  parser.add_argument("--no-ui",
                      default=False,
                      action="store_true",
                      help="Do not launch the user interface")
  parser.add_argument("--target",
                      default=None,
                      type=str,
                      help="MAC address of the target device")
  parser.add_argument("-fw",
                      "--firmware",
                      default=None,
                      type=str,
                      help="Firmware version to be tested")

  parsed_args = parser.parse_known_args()[0]

  if (parsed_args.no_ui and not parsed_args.net_only
      and (parsed_args.target is None or parsed_args.firmware is None)):
    # Capture help text
    help_text = io.StringIO()
    parser.print_help(file=help_text)

    # Get help text as lines and find where "Testrun" starts (skip usage)
    help_lines = help_text.getvalue().splitlines()
    start_index = next(
        (i for i, line in enumerate(help_lines) if "Testrun" in line), 0)

    # Join only lines starting from "Testrun" and print without extra newlines
    help_message = "\n".join(line.rstrip() for line in help_lines[start_index:])
    print(help_message)

    print(
        "Error: --target and --firmware are required when --no-ui is specified",
        file=sys.stderr)
    sys.exit(1)

  return parsed_args


if __name__ == "__main__":
  args = parse_args()
  runner = TestRunner(config_file=args.config_file,
                      validate=args.validate,
                      net_only=args.net_only,
                      single_intf=args.single_intf,
                      no_ui=args.no_ui,
                      target=args.target,
                      firmware=args.firmware)
