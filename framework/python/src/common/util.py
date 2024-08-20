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
import typing as t
import netifaces
from common import logger

LOGGER = logger.get_logger('util')


def run_command(cmd, output=True, timeout=None):
  """Runs a process at the os level
  By default, returns the standard output and error output
  If the caller sets optional output parameter to False,
  will only return a boolean result indicating if it was
  successful in running the command.  Failure is indicated
  by any return code from the process other than zero."""

  success = False
  with subprocess.Popen(shlex.split(cmd),
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE) as process:
    stdout, stderr = process.communicate(timeout)

    if process.returncode != 0 and output:
      err_msg = f'{stderr.strip()}. Code: {process.returncode}'
      LOGGER.error('Command failed: ' + cmd)
      LOGGER.error('Error: ' + err_msg)
    else:
      success = True
    if output:
      out = stdout.strip().decode('utf-8')
      return out, stderr
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
    LOGGER.error('An OS error occurred whilst calling os.getlogin()')
  except Exception: # pylint: disable=W0703
    # Catch any other unexpected exceptions
    LOGGER.error('An unknown exception occurred whilst calling os.getlogin()')
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
    'services': 'Services',
    'tls': 'TLS',
    'protocol': 'Protocol'
  }

  for module in modules.items():
    if search == module[0]:
      return module[1]

  return 'Unknown'


def diff_dicts(d1: t.Dict[t.Any, t.Any], d2: t.Dict[t.Any, t.Any]) -> t.Dict:
  """Compares two dictionaries by keys

  Args:
      d1 (t.Dict[t.Any, t.Any]): first dict to compare
      d2 (t.Dict[t.Any, t.Any]): second dict to compare

  Returns:
      t.Dict[t.Any, t.Any]: Returns an empty dictionary
      if the compared dictionaries are equal,
      otherwise returns a dictionary that contains
      the removed items(if available)
      and the added items(if available).
  """
  diff = {}
  if d1 != d2:
    s1 = set(d1)
    s2 = set(d2)
    keys_removed = s1 - s2
    keys_added = s2 - s1
    items_removed = {k:d1[k] for k in keys_removed}
    items_added = {k:d2[k] for k in keys_added}
    if items_removed:
      diff['items_removed'] = items_removed
    if items_added:
      diff['items_added'] = items_added
  return diff
