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
"""Base class for all core test module functions"""
import json
import logger
import os
import util
from datetime import datetime

LOGGER = None
RESULTS_DIR = '/runtime/output/'
CONF_FILE = '/testrun/conf/module_config.json'


class TestModule:
  """An example test module."""

  def __init__(self, module_name, log_name):
    self._module_name = module_name
    self._device_mac = os.environ['DEVICE_MAC']
    self._ipv4_addr = os.environ['IPV4_ADDR']
    self._ipv4_subnet = os.environ['IPV4_SUBNET']
    self._ipv6_subnet = os.environ['IPV6_SUBNET']
    self._add_logger(log_name=log_name, module_name=module_name)
    self._config = self._read_config()
    self._device_ipv4_addr = None
    self._device_ipv6_addr = None

  def _add_logger(self, log_name, module_name):
    global LOGGER
    LOGGER = logger.get_logger(log_name, module_name)

  def _get_logger(self):
    return LOGGER

  def _get_tests(self):
    device_test_module = self._get_device_test_module()
    return self._get_device_tests(device_test_module)

  def _get_device_tests(self, device_test_module):
    module_tests = self._config['config']['tests']
    if device_test_module is None:
      return module_tests
    elif not device_test_module['enabled']:
      return []
    else:
      for test in module_tests:
        # Resolve device specific configurations for the test if it exists
        # and update module test config with device config options
        if 'tests' in device_test_module:
          if test['name'] in device_test_module['tests']:
            dev_test_config = device_test_module['tests'][test['name']]
            if 'enabled' in dev_test_config:
              test['enabled'] = dev_test_config['enabled']
            if 'config' in test and 'config' in dev_test_config:
              test['config'].update(dev_test_config['config'])
      return module_tests

  def _get_device_test_module(self):
    if 'DEVICE_TEST_MODULES' in os.environ:
      test_modules = json.loads(os.environ['DEVICE_TEST_MODULES'])
      if self._module_name in test_modules:
        return test_modules[self._module_name]
    return None

  def run_tests(self):

    if self._config['config']['network']:
      self._device_ipv4_addr = self._get_device_ipv4()
      LOGGER.info('Device IP Resolved: ' + str(self._device_ipv4_addr))

    tests = self._get_tests()
    for test in tests:
      test_method_name = '_' + test['name'].replace('.', '_')
      result = None

      test['start'] = datetime.now().isoformat()

      if ('enabled' in test and test['enabled']) or 'enabled' not in test:
        LOGGER.debug('Attempting to run test: ' + test['name'])
        # Resolve the correct python method by test name and run test
        if hasattr(self, test_method_name):
          try:
            if 'config' in test:
              result = getattr(self, test_method_name)(config=test['config'])
            else:
              result = getattr(self, test_method_name)()
          except Exception as e:
            LOGGER.info(f'An error occurred whilst running {test["name"]}')
            LOGGER.error(e)
            return None
        else:
          LOGGER.info(f'Test {test["name"]} not implemented. Skipping')
          result = None
      else:
        LOGGER.debug(f'Test {test["name"]} is disabled')

      if result is not None:
        # Compliant or non-compliant
        if isinstance(result, bool):
          test['result'] = 'Compliant' if result else 'Non-Compliant'
          test['description'] = 'No description was provided for this test'
        else:
          if result[0] is None:
            test['result'] = 'Skipped'
            if len(result) > 1:
              test['description'] = result[1]
            else:
              test['description'] = 'An error occured whilst running this test'
          else:
            test['result'] = 'Compliant' if result[0] else 'Non-Compliant'
          test['description'] = result[1]
      else:
        test['result'] = 'Skipped'
        test['description'] = 'An error occured whilst running this test'

      test['end'] = datetime.now().isoformat()
      duration = datetime.fromisoformat(test['end']) - datetime.fromisoformat(
          test['start'])
      test['duration'] = str(duration)

    json_results = json.dumps({'results': tests}, indent=2)
    self._write_results(json_results)

  def _read_config(self):
    with open(CONF_FILE, encoding='utf-8') as f:
      config = json.load(f)
    return config

  def _write_results(self, results):
    results_file = RESULTS_DIR + self._module_name + '-result.json'
    LOGGER.info('Writing results to ' + results_file)
    with open(results_file, 'w', encoding='utf-8') as f:
      f.write(results)

  def _get_device_ipv4(self):
    command = f"""/testrun/bin/get_ipv4_addr {self._ipv4_subnet}
    {self._device_mac.upper()}"""
    text = util.run_command(command)[0]
    if text:
      return text.split('\n')[0]
    return None
