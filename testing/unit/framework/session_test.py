# Copyright 2024 Google LLC
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

"""Session methods tests"""

from unittest.mock import patch
from core import session


class MockUtil:
  """mock util functions"""

  @staticmethod
  def get_sys_interfaces():
    return {"eth0": "00:1A:2B:3C:4D:5E", "eth1": "66:77:88:99:AA:BB"}

  @staticmethod
  def diff_dicts(d1, d2):  # pylint: disable=W0613
    return {
        "items_added": {"eth1": "66:77:88:99:AA:BB"},
        "items_removed": {"eth2": "00:1B:2C:3D:4E:5F"},
    }


class TestrunSessionMock(session.TestrunSession):
  def __init__(self):  # pylint: disable=W0231
    self._ifaces = {"eth0": "00:1A:2B:3C:4D:5E", "eth2": "66:77:88:99:AA:BB"}


util = MockUtil()


@patch("common.util.get_sys_interfaces", side_effect=util.get_sys_interfaces)
@patch("common.util.diff_dicts", side_effect=util.diff_dicts)
def test_detect_network_adapters_change(
  mock_get_sys_interfaces,  # pylint: disable=W0613
  mock_diff_dicts,  # pylint: disable=W0613
):
  testrun_session = TestrunSessionMock()

  # Test added and removed
  result = testrun_session.detect_network_adapters_change()
  assert result == {
      "adapters_added": {"eth1": "66:77:88:99:AA:BB"},
      "adapters_removed": {"eth2": "00:1B:2C:3D:4E:5F"},
  }
