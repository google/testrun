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

"""Provides basic utilities for the faux-device."""
import subprocess
import shlex


def run_command(cmd, logger, output=True):
  """Runs a process at the os level
  By default, returns the standard output and error output
  If the caller sets optional output parameter to False,
  will only return a boolean result indicating if it was
  successful in running the command.  Failure is indicated
  by any return code from the process other than zero."""

  success = False
  with subprocess.Popen(
    shlex.split(cmd),
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE) as process:

    stdout, stderr = process.communicate()

    if process.returncode != 0:
      err_msg = f'{stderr.strip()}. Code: {process.returncode}'
      logger.error('Command Failed: ' + cmd)
      logger.error('Error: ' + err_msg)
    else:
      success = True
      logger.debug('Command succeeded: ' + cmd)
    if output:
      out = stdout.strip().decode('utf-8')
      logger.debug('Command output: ' + out)
      return success, out
    else:
      return success, None
