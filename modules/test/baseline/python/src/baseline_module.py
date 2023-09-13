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

"""Baseline test module"""
from test_module import TestModule

LOG_NAME = 'test_baseline'
LOGGER = None


class BaselineModule(TestModule):
  """An example testing module."""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    global LOGGER
    LOGGER = self._get_logger()

  def _baseline_compliant(self):
    LOGGER.info('Running baseline pass test')
    LOGGER.info('Baseline pass test finished')
    return True, 'Baseline pass test ran successfully'

  def _baseline_non_compliant(self):
    LOGGER.info('Running baseline non-compliant test')
    LOGGER.info('Baseline non-compliant test finished')
    return False, 'Baseline non-compliant test ran successfully'

  def _baseline_informational(self):
    LOGGER.info('Running baseline informational test')
    LOGGER.info('Baseline informational test finished')
    return None, 'Baseline informational test ran successfully'
