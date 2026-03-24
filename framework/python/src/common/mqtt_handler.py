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
import logging

from common.mqtt_topics import MQTTTopic

class MQTTHandler(logging.Handler):
  def __init__(self, mqtt_client, topic=MQTTTopic.INFO):
    super().__init__()
    self.mqtt_client = mqtt_client
    self.topic = topic

  def emit(self, record):
    if getattr(record, 'to_ui', False):
      try:
        message = self.format(record)
        self.mqtt_client.send_message(self.topic, message)
      except Exception:
        self.handleError(record)