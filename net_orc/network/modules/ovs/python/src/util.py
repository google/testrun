"""Provides basic utilities for a ovs module."""
import subprocess
import logger

LOGGER = logger.get_logger('util')

def run_command(cmd):
  success = False
  process = subprocess.Popen(cmd.split(),
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
  stdout, stderr = process.communicate()
  if process.returncode != 0:
    err_msg = f'{stderr.strip()}. Code: {process.returncode}'
    LOGGER.error('Command Failed: ' + cmd)
    LOGGER.error('Error: ' + err_msg)
  else:
    msg = stdout.strip().decode('utf-8')
    succ_msg = f'{msg}. Code: {process.returncode}'
    LOGGER.info('Command Success: ' + cmd)
    LOGGER.info('Success: ' + succ_msg)
    success = True
  return success
