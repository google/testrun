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

import json
import pytest
import re
import os

NTP_SERVER = '10.10.10.5'
DNS_SERVER = '10.10.10.4'

CI_BASELINE_OUT = '/tmp/testrun_ci.json'

@pytest.fixture
def container_data():
  dir = os.path.dirname(os.path.abspath(__file__))
  with open(CI_BASELINE_OUT, encoding='utf-8') as f:
    return json.load(f)

@pytest.fixture
def validator_results():
  dir = os.path.dirname(os.path.abspath(__file__))
  with open(os.path.join(dir,
                         '../',
                         'runtime/validation/faux-dev/result.json'),
                         encoding='utf-8') as f:
    return json.load(f)

@pytest.mark.skip(reason='requires internet')
def test_internet_connectivity(container_data):
  assert container_data['network']['internet'] == 200

def test_dhcp_ntp_option(container_data):
  """ Check DHCP gives NTP server as option """
  assert container_data['dhcp']['ntp-servers'] == NTP_SERVER

def test_dhcp_dns_option(container_data):
  assert container_data['dhcp']['domain-name-servers'] == DNS_SERVER

def test_assigned_ipv4_address(container_data):
  assert int(container_data['network']['ipv4'].split('.')[-1][:-3]) > 10

def test_ntp_server_reachable(container_data):
  assert not 'no servers' in container_data['ntp_offset']

def test_dns_server_reachable(container_data):
  assert not 'no servers' in container_data['dns_response']

def test_dns_server_resolves(container_data):
  assert re.match(r'[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}',
    container_data['dns_response'])

@pytest.mark.skip(reason='requires internet')
def test_validator_results_compliant(validator_results):
  results = [True if x['result'] == 'compliant' else False
    for x in validator_results['results']]
  assert all(results)
