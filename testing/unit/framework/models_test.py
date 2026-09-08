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

"""Host metadata tests."""

import pytest
from unittest.mock import patch, MagicMock

from common.models import Host


@pytest.mark.parametrize('status_code, json_value, expected', [
    (200,
     {'country': 'US',
      'regionName': 'California',
      'city': 'San Jose'},
      'US/California/San Jose'),
    (500, {}, ''),
])
def test_get_location_returns_expected_string(
    status_code: int,
    json_value: dict,
    expected: str
):
  mock_response = MagicMock()
  mock_response.status_code = status_code
  mock_response.json.return_value = json_value

  with patch('common.models.requests.get',
             return_value=mock_response):
    assert Host.get_location() == expected


def test_get_location_returns_empty_on_exception():
  with patch('common.models.requests.get', side_effect=Exception('network')):
    assert Host.get_location() == ''


@patch('common.models.distro.name', return_value='Ubuntu 24.04 LTS')
@patch('common.models.platform.python_version', return_value='3.12.0')
@patch.object(Host, 'get_location', return_value='')
def test_get_host_metadata_returns_expected_host(
    mock_get_location: MagicMock, #pylint: disable=W0613, W0621
    mock_python_version: MagicMock, #pylint: disable=W0613, W0621
    mock_distro_name: MagicMock #pylint: disable=W0613, W0621
):
  host = Host.get_host_metadata()

  assert host.python_version == '3.12.0'
  assert host.linux_env == 'Ubuntu 24.04 LTS'
  assert host.location == ''


def test_host_to_dict_includes_location():
  host = Host(
      python_version='3.12.0',
      linux_env='Ubuntu 24.04 LTS',
      location='US/California/San Jose'
  )

  assert host.to_dict() == {
      'python_version': '3.12.0',
      'linux_env': 'Ubuntu 24.04 LTS',
      'location': 'US/California/San Jose'
  }
