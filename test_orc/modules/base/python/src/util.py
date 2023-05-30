"""Provides basic utilities for a test module."""
import subprocess
import shlex
import logger

LOGGER = logger.get_logger('util')

# Runs a process at the os level
# By default, returns the standard output and error output
# If the caller sets optional output parameter to False,
# will only return a boolean result indicating if it was
# succesful in running the command.  Failure is indicated
# by any return code from the process other than zero.
def run_command(cmd, output=True):
  success = False
  process = subprocess.Popen(shlex.split(cmd),
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
  stdout, stderr = process.communicate()
  if process.returncode != 0 and output:
    err_msg = f'{stderr.strip()}. Code: {process.returncode}'
    LOGGER.error('Command Failed: ' + cmd)
    LOGGER.error('Error: ' + err_msg)
  else:
    success = True
  if output:
    return stdout.strip().decode('utf-8'), stderr
  else:
    return success
