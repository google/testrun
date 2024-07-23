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
"""Periodic background tasks"""

from contextlib import asynccontextmanager
import datetime
import traceback
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from common import logger, session, mqtt

# Check adapters period seconds
CHECK_NETWORK_ADAPTERS_PERIOD = 5
NETWORK_ADAPTERS_TOPIC = "network_adapters"

LOGGER = logger.get_logger("tasks")


class PeriodicTasks:
  """Background periodic tasks
  """
  def __init__(
      self, testrun_session: session.TestrunSession, mqtt_client: mqtt.MQTT
  ) -> None:
    self._session = testrun_session
    self._mqtt_client = mqtt_client
    local_tz = datetime.datetime.now().astimezone().tzinfo
    self._scheduler = AsyncIOScheduler(timezone=local_tz)

  @asynccontextmanager
  async def start(self, app: FastAPI):  # pylint: disable=unused-argument
    """Start background tasks

    Args:
        app (FastAPI): app instance
    """
    # job that checks for changes in network adapters
    self._scheduler.add_job(
        func=self._testrun.get_net_orc().network_adapters_checker,
        kwargs={
                'mgtt_client': self._mqtt_client,
                'topic': NETWORK_ADAPTERS_TOPIC
                },
        trigger='interval',
        seconds=CHECK_NETWORK_ADAPTERS_PERIOD,
    )
    self._scheduler.start()
    yield

  def network_adapters_checker(self):
    """Checks for changes in network adapters
    and sends a message to the frontend
    """
    try:
      adapters = self._session.detect_network_adapters_change()
      if adapters:
        self._mqtt_client.send_message(NETWORK_ADAPTERS_TOPIC, adapters)
    except Exception:
      LOGGER.error(traceback.format_exc())
