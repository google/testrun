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
import traceback

from common.statuses import TestResult

LOGGER = None
RESULTS_DIR = '/runtime/output/'
CONF_FILE = '/testrun/conf/module_config.json'


class TestModule:
  """An example test module."""

  def __init__(self,
               module_name,
               log_name,
               conf_file=CONF_FILE,
               results_dir=RESULTS_DIR):
    self._module_name = module_name
    self._results_dir = results_dir if results_dir is not None else RESULTS_DIR
    self._device_mac = os.environ.get('DEVICE_MAC', '')
    self._ipv4_addr = os.environ.get('IPV4_ADDR', '')
    self._ipv4_subnet = os.environ.get('IPV4_SUBNET', '')
    self._ipv6_subnet = os.environ.get('IPV6_SUBNET', '')
    self._dev_iface_mac = os.environ.get('DEV_IFACE_MAC', '')
    self._device_test_pack = json.loads(os.environ.get('DEVICE_TEST_PACK', ''))
    self._report_template_folder = os.environ.get('REPORT_TEMPLATE_PATH')
    self._base_template_file=os.environ.get('BASE_TEMPLATE_FILE')
    self._log_level = os.environ.get('LOG_LEVEL', None)
    self._add_logger(log_name=log_name)
    self._config = self._read_config(
        conf_file=conf_file if conf_file is not None else CONF_FILE)
    self._device_ipv4_addr = None
    self._device_ipv6_addr = None

  def _add_logger(self, log_name):
    global LOGGER
    LOGGER = logger.get_logger(name=log_name)
    if self._log_level is not None:
      LOGGER.setLevel(self._log_level)

  def generate_module_report(self):
    pass

  def _get_logger(self):
    return LOGGER

  def _get_tests(self):
    device_test_module = self._get_device_test_module()
    return self._get_device_tests(device_test_module)

  def _get_device_tests(self, device_test_module):
    module_tests = self._config['config']['tests']
    tests_to_run = module_tests

    # If no device specific tests have been provided, add all
    if device_test_module is not None:
      # Do not run any tests if module is disabled for this device
      if not device_test_module['enabled']:
        return []

    # Tests that will be removed because they are not in the test pack
    remove_tests = []

    # Check if all tests are in the test pack and enabled for the device
    for test in tests_to_run:

      # Resolve device specific configurations for the test if it exists
      # and update module test config with device config options
      if 'tests' in device_test_module:

        if test['name'] in device_test_module['tests']:
          dev_test_config = device_test_module['tests'][test['name']]

          # Check if the test is enabled in the device config
          if 'enabled' in dev_test_config:
            test['enabled'] = dev_test_config['enabled']

          # Copy over any device specific test configuration
          if 'config' in test and 'config' in dev_test_config:
            test['config'].update(dev_test_config['config'])

      # Search for the module test in the test pack
      found = False
      for test_pack_test in self._device_test_pack['tests']:
        if test_pack_test['name'] == test['name']:
          # Test is in the test pack
          found = True

      if not found:
        remove_tests.append(test)
    for test in remove_tests:
      tests_to_run.remove(test)

    return tests_to_run

  def _get_device_test_module(self):
    if 'DEVICE_TEST_MODULES' in os.environ:
      test_modules = json.loads(os.environ['DEVICE_TEST_MODULES'])
      if self._module_name in test_modules:
        return test_modules[self._module_name]
    return None

  def run_tests(self):

    if self._config['config']['network']:
      self._device_ipv4_addr = self._get_device_ipv4()
      LOGGER.info('Resolved device IP: ' + str(self._device_ipv4_addr))

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
          except Exception as e:  # pylint: disable=W0718
            LOGGER.error(f'An error occurred whilst running {test["name"]}') # pylint: disable=W1405
            LOGGER.error(e)
            traceback.print_exc()
        else:
          LOGGER.error(f'Test {test["name"]} has not been implemented') # pylint: disable=W1405
          result = TestResult.ERROR, 'This test could not be found'
      else:
        LOGGER.debug(f'Test {test["name"]} is disabled') # pylint: disable=W1405
        result = (TestResult.DISABLED,
                  'This test did not run because it is disabled')

      # Check if the test module has returned a result
      if result is not None:

        # Compliant or non-compliant as a boolean only
        if isinstance(result, bool):
          test['result'] = (TestResult.COMPLIANT
                            if result else TestResult.NON_COMPLIANT)
          test['description'] = 'No description was provided for this test'
        else:
          # Error result
          if result[0] is None:
            test['result'] = TestResult.ERROR
            if len(result) > 1:
              test['description'] = result[1]
            else:
              test['description'] = 'An error occurred whilst running this test'

          # Compliant / Non-Compliant result
          elif isinstance(result[0], bool):
            test['result'] = (TestResult.COMPLIANT
                              if result[0] else TestResult.NON_COMPLIANT)
          # Result may be a string, e.g Error, Feature Not Detected
          elif isinstance(result[0], str):
            test['result'] = result[0]
          else:
            LOGGER.error(f'Unknown result detected: {result[0]}')
            test['result'] = TestResult.ERROR

          # Check that description is a string
          if isinstance(result[1], str):
            test['description'] = result[1]
          else:
            test['description'] = 'No description was provided for this test'

          # Check if details were provided
          if len(result)>2:
            test['details'] = result[2]

          # Check if tags were provided
          if len(result)>3:
            test['tags'] = result[3]
      else:
        LOGGER.debug('No result was returned from the test module')
        test['result'] = TestResult.ERROR
        test['description'] = 'An error occurred whilst running this test'

      # Remove the steps to resolve if compliant already
      if (test['result'] == TestResult.COMPLIANT and 'recommendations' in test):
        test.pop('recommendations')

      test['end'] = datetime.now().isoformat()
      duration = datetime.fromisoformat(test['end']) - datetime.fromisoformat(
          test['start'])
      test['duration'] = str(duration)

    json_results = json.dumps({'results': tests}, indent=2)
    self._write_results(json_results)

  def _read_config(self, conf_file=CONF_FILE):
    with open(conf_file, encoding='utf-8') as f:
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
    text = util.run_command(command)[0] # pylint: disable=E1120
    if text:
      return text.split('\n')[0]
    return None
