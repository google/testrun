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

"""PeriodicTasks tests."""

import logging
from unittest import mock

from common import tasks as common_tasks
from core import tasks as core_tasks


def test_core_periodic_tasks_init():
  testrun_obj = mock.MagicMock()
  testrun_obj.get_session().get_runtime_params.return_value = {}

  tasks_instance = core_tasks.PeriodicTasks(testrun_obj)

  assert tasks_instance._scheduler._job_defaults['misfire_grace_time'] is None
  assert tasks_instance._scheduler._job_defaults['coalesce']
  assert tasks_instance._scheduler._job_defaults['max_instances'] == 1

  assert tasks_instance.adapters_checker_job.misfire_grace_time is None
  assert tasks_instance.adapters_checker_job.coalesce
  assert tasks_instance.adapters_checker_job.max_instances == 1

  assert tasks_instance.internet_shecker.misfire_grace_time is None
  assert tasks_instance.internet_shecker.coalesce
  assert tasks_instance.internet_shecker.max_instances == 1

  assert logging.getLogger('apscheduler').level == logging.ERROR
  default_executor_logger = logging.getLogger('apscheduler.executors.default')
  assert default_executor_logger.level == logging.ERROR
  assert tasks_instance._scheduler._logger.level == logging.ERROR


def test_common_periodic_tasks_init():
  testrun_obj = mock.MagicMock()
  testrun_obj.get_session().get_runtime_params.return_value = {}

  tasks_instance = common_tasks.PeriodicTasks(testrun_obj)

  assert tasks_instance._scheduler._job_defaults['misfire_grace_time'] is None
  assert tasks_instance._scheduler._job_defaults['coalesce']
  assert tasks_instance._scheduler._job_defaults['max_instances'] == 1

  assert tasks_instance.adapters_checker_job.misfire_grace_time is None
  assert tasks_instance.adapters_checker_job.coalesce
  assert tasks_instance.adapters_checker_job.max_instances == 1

  assert tasks_instance.internet_shecker.misfire_grace_time is None
  assert tasks_instance.internet_shecker.coalesce
  assert tasks_instance.internet_shecker.max_instances == 1

  assert logging.getLogger('apscheduler').level == logging.ERROR
  default_executor_logger = logging.getLogger('apscheduler.executors.default')
  assert default_executor_logger.level == logging.ERROR
  assert tasks_instance._scheduler._logger.level == logging.ERROR


def test_periodic_tasks_single_intf():
  testrun_obj = mock.MagicMock()
  testrun_obj.get_session().get_runtime_params.return_value = {
      'single_intf': True
  }

  tasks_instance = core_tasks.PeriodicTasks(testrun_obj)

  assert hasattr(tasks_instance, 'adapters_checker_job')
  assert not hasattr(tasks_instance, 'internet_shecker')
