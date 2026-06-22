# Copyright 2026 Google LLC
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

"""Util tests"""

from unittest.mock import patch, MagicMock
import pytest
from common import util


# Tests for run_command()

@patch('subprocess.Popen')
def test_run_command_success_with_output(mock_popen: MagicMock):
  # Setup mock process
  mock_process = MagicMock()
  mock_process.communicate.return_value = (b'my_output\n', b'')
  mock_process.returncode = 0
  mock_popen.return_value.__enter__.return_value = mock_process

  out, err = util.run_command('ls -la', output=True)
  assert out == 'my_output'
  assert err == b''
  mock_popen.assert_called_once()


@patch('subprocess.Popen')
def test_run_command_success_no_output(mock_popen: MagicMock):
  mock_process = MagicMock()
  mock_process.communicate.return_value = (b'', b'')
  mock_process.returncode = 0
  mock_popen.return_value.__enter__.return_value = mock_process

  success = util.run_command('ls -la', output=False)
  assert success is True


@patch('subprocess.Popen')
@patch.object(util, 'LOGGER')
def test_run_command_failure_with_logging(
  mock_logger: MagicMock,
  mock_popen: MagicMock
):
  mock_process = MagicMock()
  mock_process.communicate.return_value = (b'', b'Permission denied')
  mock_process.returncode = 1
  mock_popen.return_value.__enter__.return_value = mock_process

  out, err = util.run_command('rm -rf /', output=True, supress_error=False)
  assert out == ''
  assert err == b'Permission denied'
  mock_logger.error.assert_any_call('Command failed: rm -rf /')


@patch('subprocess.Popen')
@patch.object(util, 'LOGGER')
def test_run_command_failure_suppress_error(
  mock_logger: MagicMock,
  mock_popen: MagicMock
):
  mock_process = MagicMock()
  mock_process.communicate.return_value = (b'', b'Some error')
  mock_process.returncode = 1
  mock_popen.return_value.__enter__.return_value = mock_process

  out, err = util.run_command('some_cmd', output=True, supress_error=True)
  assert out == ''
  assert err == b'Some error'
  mock_logger.error.assert_not_called()


# Tests for interface_exists()

@patch('netifaces.interfaces')
def test_interface_exists(mock_interfaces: MagicMock):
  mock_interfaces.return_value = ['lo', 'eth0', 'wlan0']
  assert util.interface_exists('eth0') is True
  assert util.interface_exists('eth1') is False


# Tests for prettify()

def test_prettify_mac():
  # Prettify expects a string (or a mock byte-like string)
  mac_string = '\x00\x0a\x95\x9d\x68\x16'
  assert util.prettify(mac_string) == '00:0a:95:9d:68:16'


# Tests for get_sudo_user()

@patch.dict('os.environ', {'SUDO_USER': 'root_user'})
def test_get_sudo_user_present():
  assert util.get_sudo_user() == 'root_user'


@patch.dict('os.environ', {}, clear=True)
def test_get_sudo_user_absent():
  assert util.get_sudo_user() is None

# Tests for get_pwd_user()

@patch('os.getuid')
@patch('pwd.getpwuid')
def test_get_pwd_user_success(
  mock_getpwuid: MagicMock,
  mock_getuid: MagicMock
):
  mock_getuid.return_value = 1000
  mock_pw = MagicMock()
  mock_pw.pw_name = 'testuser'
  mock_getpwuid.return_value = mock_pw

  assert util.get_pwd_user() == 'testuser'
  mock_getpwuid.assert_called_once_with(1000)


# Tests for get_host_user()

@patch.object(util, 'get_sudo_user')
def test_get_host_user_via_sudo(mock_get_sudo_user: MagicMock):
  mock_get_sudo_user.return_value = 'sudo_dev'
  assert util.get_host_user() == 'sudo_dev'


@patch('util.get_sudo_user')
@patch('os.getlogin')
def test_get_host_user_via_getlogin(
  mock_getlogin: MagicMock,
  mock_get_sudo_user: MagicMock
):
  mock_get_sudo_user.return_value = None
  mock_getlogin.return_value = 'login_dev'
  assert util.get_host_user() == 'login_dev'


@patch('util.get_sudo_user')
@patch('os.getlogin')
@patch('getpass.getuser')
def test_get_host_user_via_getpass(
   mock_getuser: MagicMock,
   mock_getlogin: MagicMock,
   mock_get_sudo_user: MagicMock
):
  mock_get_sudo_user.return_value = None
  mock_getlogin.side_effect = OSError('No tty')
  mock_getuser.return_value = 'getpass_dev'
  assert util.get_host_user() == 'getpass_dev'


# Tests for set_file_owner()

@patch(f'{util.__name__}.run_command')
def test_set_file_owner(mock_run_command: MagicMock):
  util.set_file_owner('/path/to/file', 'admin')
  mock_run_command.assert_called_once_with('chown -R admin /path/to/file')


# Tests for get_module_display_name()

@pytest.mark.parametrize('search_name, expected_display', [
    ('ntp', 'NTP'),
    ('dns', 'DNS'),
    ('connection', 'Connection'),
    ('services', 'Services'),
    ('tls', 'TLS'),
    ('protocol', 'Protocol'),
    ('unknown_mod', 'Unknown'),
])
def test_get_module_display_name(
  search_name: str,
  expected_display: str
):
  assert util.get_module_display_name(search_name) == expected_display


# Tests for diff_dicts()

def test_diff_dicts_identical():
  d1 = {'a': 1, 'b': 2}
  d2 = {'a': 1, 'b': 2}
  assert util.diff_dicts(d1, d2) == {}


def test_diff_dicts_items_removed():
  d1 = {'a': 1, 'b': 2}
  d2 = {'a': 1}
  assert util.diff_dicts(d1, d2) == {
      'items_removed': {'b': 2}
  }


def test_diff_dicts_items_added():
  d1 = {'a': 1}
  d2 = {'a': 1, 'c': 3}
  assert util.diff_dicts(d1, d2) == {
      'items_added': {'c': 3}
  }


def test_diff_dicts_mixed():
  d1 = {'a': 1, 'b': 2}
  d2 = {'a': 1, 'c': 3}
  assert util.diff_dicts(d1, d2) == {
      'items_removed': {'b': 2},
      'items_added': {'c': 3}
  }


# Tests for get_system_timezone()

@patch('tzlocal.get_localzone')
def test_get_system_timezone_success(
  mock_get_localzone: MagicMock
):
  mock_zone = MagicMock()
  mock_zone.__str__.return_value = 'America/New_York'
  mock_get_localzone.return_value = mock_zone
  assert util.get_system_timezone() == 'America/New_York'


@patch('tzlocal.get_localzone')
def test_get_system_timezone_exception(
  mock_get_localzone: MagicMock
):
  mock_get_localzone.side_effect = Exception('System error reading timezone')
  assert util.get_system_timezone() == 'UTC'
