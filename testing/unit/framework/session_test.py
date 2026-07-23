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

"""Session methods tests"""

import datetime
import os
import pytest
import pytz
from unittest.mock import patch, MagicMock, mock_open

from common.statuses import TestResult
from common.device import Device
from core import session


def create_mock_cert(
        common_name: str = "TestCert",
        org_name: str = "TestOrg",
        expired: bool = False,
        self_signed: bool = True
) -> MagicMock:
  mock_cert = MagicMock()
  mock_cn_attr = MagicMock()
  mock_cn_attr.value = common_name
  mock_cert.subject.get_attributes_for_oid.return_value = [mock_cn_attr]

  mock_org_attr = MagicMock()
  mock_org_attr.value = org_name
  mock_cert.issuer.get_attributes_for_oid.return_value = [mock_org_attr]
  date_now = datetime.datetime.now(pytz.utc)
  if expired:
    mock_cert.not_valid_after_utc = date_now - datetime.timedelta(days=1)
  else:
    mock_cert.not_valid_after_utc = date_now + datetime.timedelta(days=365)

  if self_signed:
    mock_cert.issuer = mock_cert.subject
  else:
    mock_cert.issuer = MagicMock()
  return mock_cert


@pytest.fixture
def mock_dependencies():
  """Fixture to globally mock system-level side effects during __init__."""
  with patch("session.util.get_host_user", return_value="testuser"), \
    patch("session.util.run_command", return_value=("1.0.0", b"")), \
    patch("session.mqtt.MQTT") as mock_mqtt_cls, \
    patch("session.IPControl") as mock_ip_control, \
    patch("os.path.isfile", return_value=False), \
    patch("os.path.exists", return_value=True), \
    patch("os.listdir", return_value=[]), \
    patch("builtins.open", mock_open(read_data="[]")):

    # Prepare a mock MQTT client instance
    mock_mqtt_inst = MagicMock()
    mock_mqtt_cls.return_value = mock_mqtt_inst

    yield {
        "mqtt": mock_mqtt_inst,
        "ip_control": mock_ip_control
    }


@pytest.fixture
def session_instance(mock_dependencies: dict): #pylint: disable=W0613, W0621
  """Fixture to instantiate a TestrunSession with clean mocked states."""
  sess = session.TestrunSession(root_dir="/fake/root")
  return sess

def test_session_init_default_config(
      session_instance: session.TestrunSession #pylint: disable=W0621
):
  """Test that default configuration dictionary is correctly generated."""
  assert session_instance.get_config()["startup_timeout"] == 60
  assert session_instance.get_config()["log_level"] == "INFO"
  assert session_instance.get_host_user() == "testuser"
  assert session_instance.get_timezone() == "UTC"


@patch("session.util.run_command")
def test_load_version_via_dpkg(
   mock_run_cmd: MagicMock,
   mock_dependencies: dict #pylint: disable=W0613, W0621
   ):
  """Test that version is fetched successfully from dpkg database."""
  mock_run_cmd.return_value = ("2.3.1", b"") # No stderr
  sess = session.TestrunSession(root_dir="/fake/root")
  assert sess.get_version() == "2.3.1"


@patch("session.util.run_command")
@patch("os.path.exists")
def test_load_version_via_make_control(
   mock_exists: MagicMock,
   mock_run_cmd: MagicMock,
   mock_dependencies: dict #pylint: disable=W0613, W0621
):
  """Test version fallback to make control file if dpkg fails."""
  mock_run_cmd.side_effect = [
    ("", b"error_dpkg"),
    ("Version: 1.4.2-beta", b""),
    ("", b"error_dpkg"),
    ("Version: 1.4.2-beta", b""),
  ]
  mock_exists.return_value = True
  sess = session.TestrunSession(root_dir="/fake/root")
  assert sess.get_version() == "1.4.2-beta"


# 3. Target Device Repository Tests

def test_device_repository_operations(
  session_instance: session.TestrunSession #pylint: disable=W0621
):
  """Test adding, fetching, and removing devices from session repository."""
  device = Device()
  device.device_folder = "Raspberry_Pi"
  device.manufacturer = "Raspberry"
  device.model = "Pi 4"
  device.mac_addr = "00:11:22:33:44:55"

  session_instance.add_device(device)
  assert session_instance.get_device_by_name("raspberry_pi") == device
  assert session_instance.get_device_by_name("non_existent") is None
  assert session_instance.get_device_by_mac_addr("001122334455") == device
  session_instance.remove_device(device)
  assert len(session_instance.get_device_repository()) == 0


# 4. Test Results Aggregation Tests

def test_add_test_result_new(
  session_instance: session.TestrunSession
): #pylint: disable=W0621
  """Test adding a brand new test result."""
  result = MagicMock()
  result.name = "DNS Security Check"
  result.description = "Checks DNS encryption"
  result.details = "Everything is secure"
  result.recommendations = []
  result.required_result = "Compliant"
  result.result = TestResult.COMPLIANT

  session_instance.add_test_result(result)
  assert len(session_instance.get_test_results()) == 1


def test_add_test_result_update_existing(
      session_instance: session.TestrunSession
): #pylint: disable=W0621
  initial_result = MagicMock()
  initial_result.name = "NTP Sync"
  initial_result.description = "NTP Initial State"
  initial_result.details = "Checking sync..."
  initial_result.required_result = "Compliant"
  initial_result.result = TestResult.IN_PROGRESS
  initial_result.recommendations = None

  session_instance._results = [initial_result] #pylint: disable=W0212

  updated_result = MagicMock()
  updated_result.name = "NTP Sync"
  updated_result.description = "NTP Verification Success"
  updated_result.details = ["Sync complete.", "Server resolved."]
  updated_result.recommendations = ["Keep server stable"]
  updated_result.result = TestResult.COMPLIANT

  session_instance.add_test_result(updated_result)

  assert initial_result.description == "NTP Verification Success"
  assert initial_result.details == "Sync complete. Server resolved."
  assert initial_result.recommendations == ["Keep server stable"]
  assert initial_result.result == TestResult.COMPLIANT


def test_add_test_result_informational_coercion(
      session_instance: session.TestrunSession
): #pylint: disable=W0621
  initial_result = MagicMock()
  initial_result.name = "TLS Cipher Suit"
  initial_result.required_result = "Informational"
  initial_result.result = TestResult.IN_PROGRESS
  initial_result.recommendations = None

  session_instance._results = [initial_result] #pylint: disable=W0212

  updated_result = MagicMock()
  updated_result.name = "TLS Cipher Suit"
  updated_result.result = TestResult.NON_COMPLIANT
  updated_result.recommendations = ["Upgrade ciphers"]

  session_instance.add_test_result(updated_result)
  assert initial_result.result == TestResult.INFORMATIONAL
  assert initial_result.optional_recommendations == ["Upgrade ciphers"]
  assert initial_result.recommendations is None


# 5. Risk Profile Validation Tests

def test_validate_profile_json_invalid_cases(
    session_instance: session.TestrunSession
): #pylint: disable=W0621
  """Test validation errors for improperly structured risk profiles."""
  # Missing name
  assert session_instance.validate_profile_json(
     {"status": "Valid"}) is False
  # Empty Name
  assert session_instance.validate_profile_json(
     {"name": "   ", "status": "Valid"}
     ) is False
  # Name contains forbidden characters
  assert session_instance.validate_profile_json(
     {"name": "Profile/Invalid", "status": "Valid"}
    ) is False


def test_validate_profile_json_question_validation(
  session_instance: session.TestrunSession
): #pylint: disable=W0621
  # Define simple profile formats
  session_instance._profile_format_json = [ #pylint: disable=W0212
      {
        "question": "Q1",
        "type": "select",
        "options": ["Yes", "No"]
      },
      {"question": "Q2",
       "type": "select-multiple",
       "options": ["Option A", "Option B"]
      }
  ]

  # Valid profile JSON
  valid_profile = {
      "name": "My Valid Profile",
      "status": "Valid",
      "questions": [
          {"question": "Q1", "answer": "Yes"},
          {"question": "Q2", "answer": [0, 1]}
      ]
  }
  assert session_instance.validate_profile_json(valid_profile) is True

  # Invalid string answer in select-multiple
  invalid_profile_type = {
      "name": "Invalid Profile",
      "status": "Valid",
      "questions": [
          {
            "question": "Q2",
            "answer": "Option A"
          }
      ]
  }
  assert session_instance.validate_profile_json(invalid_profile_type) is False

  # Invalid option selected
  invalid_select_option = {
      "name": "Invalid Profile",
      "status": "Valid",
      "questions": [
          {"question": "Q1",
           "answer": "Maybe"
          }
      ]
  }
  assert session_instance.validate_profile_json(invalid_select_option) is False


# 6. Certificate Management Tests

@patch("os.path.exists", return_value=False)
def test_check_cert_file_name(
   mock_exists: MagicMock, #pylint: disable=W0613
   session_instance: session.TestrunSession #pylint: disable=W0621
):
  assert session_instance.check_cert_file_name("unique_cert_name.pem") is True


@patch("session.x509.load_pem_x509_certificate")
@patch("builtins.open", new_callable=mock_open)
@patch("session.util.run_command")
def test_upload_cert_success(
   mock_run_cmd: MagicMock,
   mock_file_open: MagicMock,
   mock_load_cert: MagicMock,
   session_instance: session.TestrunSession #pylint: disable=W0621
):
  mock_cert = create_mock_cert(
    common_name="GoogleRootCA",
    org_name="Google LLC",
    expired=False
  )
  mock_load_cert.return_value = mock_cert

  cert_obj = session_instance.upload_cert(
    filename="google_root.pem",
    content=b"fake_pem_bytes"
  )

  assert cert_obj["name"] == "GoogleRootCA"
  assert cert_obj["status"] == "Valid"

  mock_file_open.assert_called_once_with(
    os.path.join(
      session.CERTS_PATH, "google_root.pem"
      ),
    "wb")
  mock_run_cmd.assert_called_once_with(
    f"chown -R testuser {session.CERTS_PATH}"
  )


@patch("session.x509.load_pem_x509_certificate")
def test_upload_cert_missing_cn(
  mock_load_cert: MagicMock,
  session_instance: session.TestrunSession #pylint: disable=W0621
):
  mock_cert = MagicMock()
  mock_cert.subject.get_attributes_for_oid.return_value = []
  mock_load_cert.return_value = mock_cert
  with pytest.raises(
    ValueError,
    match="Certificate is missing the common name"
  ):
    session_instance.upload_cert(
      filename="broken_cert.pem",
      content=b"raw_bytes"
    )


@patch("session.x509.load_pem_x509_certificate")
@patch("session.os.listdir", return_value=["existing_root.pem"])
@patch("builtins.open", new_callable=mock_open)
def test_load_certs(
  mock_file: MagicMock, #pylint: disable=W0613
  mock_listdir: MagicMock, #pylint: disable=W0613
  mock_load_cert: MagicMock,
  session_instance: session.TestrunSession  #pylint: disable=W0621
  ):
  mock_cert = create_mock_cert(
    common_name="MyAuthority",
    org_name="MyCorp",
    expired=False,
    self_signed=True
  )
  mock_load_cert.return_value = mock_cert
  session_instance.load_certs()

  assert len(session_instance.get_certs()) == 1
  cert = session_instance.get_certs()[0]
  assert cert["name"] == "MyAuthority"
  assert cert["type"] == "root"


@patch("session.os.remove")
def test_delete_cert_success(
  mock_remove: MagicMock,
  session_instance: session.TestrunSession  #pylint: disable=W0621
):
  session_instance._certs = [ #pylint: disable=W0212
      {"filename": "test.pem", "name": "Test"}
  ]
  success = session_instance.delete_cert("test.pem")
  assert success is True
  assert len(session_instance.get_certs()) == 0
  mock_remove.assert_called_once_with(
    os.path.join(session.CERTS_PATH,
                 "test.pem")
  )


# 7. Network Change Detection Tests

@patch("session.util.diff_dicts")
def test_detect_network_adapters_change(
  mock_diff: MagicMock,
  session_instance: session.TestrunSession  #pylint: disable=W0621
  ):
  with patch.object(session.IPControl, "get_sys_interfaces") as mock_get_sys:
    mock_get_sys.return_value = {"eth0": "up", "wlan0": "down"}
    session_instance._ifaces = {"eth0": "up"} #pylint: disable=W0212
    mock_diff.return_value = {
        "items_added": {"wlan0": "down"}
    }
    changes = session_instance.detect_network_adapters_change()
    assert "adapters_added" in changes
    assert changes["adapters_added"] == {"wlan0": "down"}
    assert "adapters_removed" not in changes
    # Verify that session_instance updated its local _ifaces state
    assert session_instance.get_ifaces() == {"eth0": "up", "wlan0": "down"}

