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

"""Provides basic utilities for the network orchestrator."""
import getpass
import os
import subprocess
import shlex
from common import logger
import netifaces

LOGGER = logger.get_logger('util')


def run_command(cmd, output=True):
  """Runs a process at the os level
  By default, returns the standard output and error output
  If the caller sets optional output parameter to False,
  will only return a boolean result indicating if it was
  succesful in running the command.  Failure is indicated
  by any return code from the process other than zero."""

  success = False
  process = subprocess.Popen(shlex.split(cmd),
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
  stdout, stderr = process.communicate()

  if process.returncode != 0 and output:
    err_msg = f'{stderr.strip()}. Code: {process.returncode}'
    LOGGER.error('Command failed: ' + cmd)
    LOGGER.error('Error: ' + err_msg)
  else:
    success = True
  if output:
    return stdout.strip().decode('utf-8'), stderr
  else:
    return success


def interface_exists(interface):
  return interface in netifaces.interfaces()

def prettify(mac_string):
  return ':'.join([f'{ord(b):02x}' for b in mac_string])

def get_host_user():
  user = get_os_user()

  # If primary method failed, try secondary
  if user is None:
    user = get_user()

  return user

def get_os_user():
  user = None
  try:
    user = os.getlogin()
  except OSError:
    # Handle the OSError exception
    LOGGER.error('An OS error occured whilst calling os.getlogin()')
  except Exception:
    # Catch any other unexpected exceptions
    LOGGER.error('An unknown exception occured whilst calling os.getlogin()')
  return user

def get_user():
  user = None
  try:
    user = getpass.getuser()
  except (KeyError, ImportError, ModuleNotFoundError, OSError) as e:
    # Handle specific exceptions individually
    if isinstance(e, KeyError):
      LOGGER.error('USER environment variable not set or unavailable.')
    elif isinstance(e, ImportError):
      LOGGER.error('Unable to import the getpass module.')
    elif isinstance(e, ModuleNotFoundError):
      LOGGER.error('The getpass module was not found.')
    elif isinstance(e, OSError):
      LOGGER.error('An OS error occurred while retrieving the username.')
    else:
      LOGGER.error('An exception occurred:', e)
  return user

def set_file_owner(path, owner):
  run_command(f'chown -R {owner} {path}')

def get_module_display_name(search):
  modules = {
    'ntp': 'NTP',
    'dns': 'DNS',
    'connection': 'Connection',
    'nmap': 'Services',
    'tls': 'TLS'
  }

  for module in modules.items():
    if search == module[0]:
      return module[1]

  return 'Unknown'
