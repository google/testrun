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

"""Test Orchestrator module loading and ordering tests"""

from unittest.mock import patch, MagicMock
import pytest

from test_orc import test_orchestrator
from test_orc import test_pack


# pylint: disable=redefined-outer-name,protected-access


@pytest.fixture
def mock_session():
  sess = MagicMock()
  sess.get_api_url.return_value = "http://localhost"
  sess.get_api_port.return_value = 8000
  return sess


@pytest.fixture
def mock_net_orc():
  net = MagicMock()
  net.get_ip_address.return_value = "172.17.0.1"
  return net


@pytest.fixture
def orchestrator(mock_session, mock_net_orc):
  orc = test_orchestrator.TestOrchestrator(mock_session, mock_net_orc)
  return orc


def test_load_test_modules_repeatable_order(orchestrator):
  """Test that _load_test_modules loads test modules in repeatable order."""
  orchestrator._load_test_modules()
  module_names = [m.dir_name for m in orchestrator.get_test_modules()]

  # base is loaded first as dependency of protocol
  # protocol is first runnable module
  # services is always before conn
  # followed by dns, ntp, tls in alphabetical order
  assert module_names == [
      "base",
      "protocol",
      "baseline",
      "services",
      "conn",
      "dns",
      "ntp",
      "tls",
  ]


@pytest.mark.parametrize(
    "raw_dir_listing",
    [
        ["services", "conn", "tls", "protocol", "dns", "ntp", "base"],
        ["tls", "ntp", "dns", "conn", "services", "protocol", "base"],
        ["protocol", "services", "conn", "base", "dns", "ntp", "tls"],
        ["conn", "services", "protocol", "dns", "ntp", "tls", "base"],
        ["base", "tls", "ntp", "dns", "conn", "services", "protocol"],
    ],
)
def test_load_test_modules_various_listdir_permutations(
    orchestrator, raw_dir_listing
):
  """Test that regardless of raw filesystem listing order, modules are always

  loaded in the exact same deterministic order.
  """
  with patch("os.listdir", return_value=raw_dir_listing):
    orchestrator._load_test_modules()
    module_names = [m.dir_name for m in orchestrator.get_test_modules()]

    assert module_names == [
        "base",
        "protocol",
        "services",
        "conn",
        "dns",
        "ntp",
        "tls",
    ]


def test_test_pack_get_test_packs_sorted():
  """Test that TestPack.get_test_packs loads test packs in sorted order."""
  test_packs = test_pack.TestPack.get_test_packs()
  pack_names = [tp.name for tp in test_packs]
  assert len(pack_names) >= 2
  # Pilot Assessment before Device Qualification
  assert pack_names == ["Pilot Assessment", "Device Qualification"]
