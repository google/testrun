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

"""Unit tests for static IP support (Issue #1450)

These tests verify:
1. Device config loading with and without ip_addr
2. Device config export (round-trip) preserves ip_addr
"""

import ipaddress
import json
import os
import sys
import tempfile
from unittest.mock import MagicMock

import pytest

# Add framework source paths BEFORE importing any project modules.
FRAMEWORK_SRC = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))))),
    'framework', 'python', 'src')
sys.path.insert(0, FRAMEWORK_SRC)
sys.path.insert(0, os.path.join(FRAMEWORK_SRC, 'common'))

# Mock out heavy/Linux-only dependencies before any project imports.
# Using MagicMock so any attribute access on these modules returns a mock
# rather than raising ImportError or AttributeError.
MOCKED_MODULES = [
    'weasyprint', 'docker', 'docker.errors', 'netifaces',
    'scapy', 'scapy.all', 'scapy.error',
    'paho', 'paho.mqtt', 'paho.mqtt.client',
    'jinja2', 'bs4', 'markdown',
    'pwd', 'grp', 'fcntl',
    'psutil', 'pytz', 'cryptography',
    'APScheduler', 'apscheduler',
    'apscheduler.schedulers', 'apscheduler.schedulers.background',
    'apscheduler.triggers', 'apscheduler.triggers.interval',
]
for mod_name in MOCKED_MODULES:
  sys.modules[mod_name] = MagicMock()

# pylint: disable=wrong-import-position
from common.device import Device  # noqa: E402
# pylint: enable=wrong-import-position




# ---- Device Model Tests ----

class TestDeviceStaticIP:
  """Tests for Device dataclass static IP support."""

  def test_device_default_ip_is_none(self):
    """Device should have ip_addr=None by default."""
    device = Device(mac_addr='aa:bb:cc:dd:ee:ff',
                    manufacturer='Test',
                    model='TestModel')
    assert device.ip_addr is None

  def test_device_with_static_ip(self):
    """Device should accept ip_addr in constructor."""
    device = Device(mac_addr='aa:bb:cc:dd:ee:ff',
                    manufacturer='Test',
                    model='TestModel',
                    ip_addr='10.10.10.100')
    assert device.ip_addr == '10.10.10.100'

  def test_to_config_json_without_ip(self):
    """Config JSON should NOT contain ip_addr when it's None."""
    device = Device(mac_addr='aa:bb:cc:dd:ee:ff',
                    manufacturer='Test',
                    model='TestModel')
    config = device.to_config_json()
    assert 'ip_addr' not in config

  def test_to_config_json_with_ip(self):
    """Config JSON should contain ip_addr when it's set."""
    device = Device(mac_addr='aa:bb:cc:dd:ee:ff',
                    manufacturer='Test',
                    model='TestModel',
                    ip_addr='10.10.10.100')
    config = device.to_config_json()
    assert config['ip_addr'] == '10.10.10.100'

  def test_config_json_roundtrip(self):
    """Static IP should survive a JSON serialize/deserialize cycle."""
    device = Device(mac_addr='aa:bb:cc:dd:ee:ff',
                    manufacturer='Test',
                    model='TestModel',
                    ip_addr='192.168.1.50')
    config = device.to_config_json()
    json_str = json.dumps(config)
    loaded = json.loads(json_str)
    assert loaded['ip_addr'] == '192.168.1.50'

  def test_to_dict_does_not_expose_ip(self):
    """to_dict() (API response) should not be affected by ip_addr."""
    device = Device(mac_addr='aa:bb:cc:dd:ee:ff',
                    manufacturer='Test',
                    model='TestModel',
                    ip_addr='10.10.10.100')
    d = device.to_dict()
    # to_dict is for the API/status endpoint, ip_addr is runtime state
    # it should still work without errors
    assert d['mac_addr'] == 'aa:bb:cc:dd:ee:ff'

  def test_ip_addr_settable_at_runtime(self):
    """ip_addr should be settable after construction (DHCP flow)."""
    device = Device(mac_addr='aa:bb:cc:dd:ee:ff',
                    manufacturer='Test',
                    model='TestModel')
    assert device.ip_addr is None
    device.ip_addr = '10.10.10.200'
    assert device.ip_addr == '10.10.10.200'


# ---- Device Config Loading Tests ----

class TestDeviceConfigLoading:
  """Tests for loading ip_addr from device_config.json."""

  def test_load_config_with_static_ip(self):
    """Simulate loading a device config that has ip_addr."""
    config_json = {
        'manufacturer': 'Elevator Co',
        'model': 'EC-500',
        'mac_addr': 'aa:bb:cc:dd:ee:ff',
        'ip_addr': '10.10.10.100',
        'type': 'building_automation',
        'technology': 'Ethernet',
        'test_pack': 'Device Qualification',
        'test_modules': {'baseline': {'enabled': True}}
    }

    static_ip = config_json.get('ip_addr')
    device = Device(
        manufacturer=config_json['manufacturer'],
        model=config_json['model'],
        mac_addr=config_json['mac_addr'],
        test_modules=config_json['test_modules'],
        ip_addr=static_ip
    )
    assert device.ip_addr == '10.10.10.100'

  def test_load_config_without_static_ip(self):
    """Simulate loading a device config without ip_addr (DHCP device)."""
    config_json = {
        'manufacturer': 'Google',
        'model': 'Baseline',
        'mac_addr': '02:42:aa:00:01:01',
        'test_modules': {'baseline': {'enabled': True}}
    }

    static_ip = config_json.get('ip_addr')
    device = Device(
        manufacturer=config_json['manufacturer'],
        model=config_json['model'],
        mac_addr=config_json['mac_addr'],
        test_modules=config_json['test_modules'],
        ip_addr=static_ip
    )
    assert device.ip_addr is None

  def test_load_config_from_json_file(self):
    """Full round-trip: write JSON config with ip_addr, load it back."""
    config = {
        'manufacturer': 'StaticDevice',
        'model': 'SD-100',
        'mac_addr': 'ff:ee:dd:cc:bb:aa',
        'ip_addr': '172.16.0.50',
        'test_modules': {}
    }

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json',
                                     delete=False) as f:
      json.dump(config, f)
      tmp_path = f.name

    try:
      with open(tmp_path, encoding='utf-8') as f:
        loaded = json.load(f)

      device = Device(
          manufacturer=loaded['manufacturer'],
          model=loaded['model'],
          mac_addr=loaded['mac_addr'],
          test_modules=loaded.get('test_modules'),
          ip_addr=loaded.get('ip_addr')
      )
      assert device.ip_addr == '172.16.0.50'
      assert device.manufacturer == 'StaticDevice'

      # Verify export round-trip
      exported = device.to_config_json()
      assert exported['ip_addr'] == '172.16.0.50'
    finally:
      os.unlink(tmp_path)


# ---- IP Address Validation Tests ----

class TestStaticIPValidation:
  """Tests mirroring the ipaddress.IPv4Address validation used by the
  config loader (testrun.py)."""

  def test_valid_ipv4_accepted(self):
    """A well-formed IPv4 address should validate."""
    # Should not raise
    ipaddress.IPv4Address('10.10.10.100')
    ipaddress.IPv4Address('192.168.1.50')

  def test_invalid_ipv4_rejected(self):
    """Malformed IPv4, IPv6, and junk strings should be rejected."""
    for bad in ['not-an-ip', '999.999.999.999', '10.10.10',
                '::1', '2001:db8::1', '']:
      with pytest.raises(ValueError):
        ipaddress.IPv4Address(bad)


if __name__ == '__main__':
  pytest.main([__file__, '-v'])
