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

"""MQTT client"""
import json
import typing as t
import paho.mqtt.client as mqtt_client
from enum import Enum

class MQTTTopic(str, Enum):
  INFO = "info"
  INTERNET_CONNECTION_TOPIC = "events/internet"
  NETWORK_ADAPTERS_TOPIC = "events/adapter"
  STATUS_TOPIC = "status"


WEBSOCKETS_HOST = "localhost"
WEBSOCKETS_PORT = 1883

class MQTTException(Exception):
  def __init__(self, message: str) -> None:
    super().__init__(message)


class MQTT:
  """ MQTT client class"""
  def __init__(self, logger=None) -> None:
    self._logger = logger
    self._host = WEBSOCKETS_HOST
    self._client = mqtt_client.Client(mqtt_client.CallbackAPIVersion.VERSION2)
    self._connect()

  def __enter__(self):
    self._connect()
    return self

  def __exit__(self, exc_type, exc_value, exc_traceback):
    if exc_traceback and self._logger is not None:
      self._logger.error(exc_traceback)
    self.disconnect()

  def _connect(self):
    """Establish connection to MQTT broker"""
    if not self._client.is_connected():
      try:
        self._client.connect(self._host, WEBSOCKETS_PORT, 60)
      except (ValueError, ConnectionRefusedError):
        if self._logger is not None:
          self._logger.error("Cannot connect to MQTT broker")

  def disconnect(self):
    """Disconnect the local client from the MQTT broker"""
    if self._client.is_connected():
      if self._logger is not None:
        self._logger.debug("Disconnecting from MQTT broker")
      self._client.disconnect()

  def send_message(self, topic: str, message: t.Union[str, dict]) -> None:
    """Send message to specific topic

    Args:
        topic (str): mqtt topic
        message (t.Union[str, dict]): message
    """
    if isinstance(message, dict):
      message = json.dumps(message)
    self._client.publish(topic, str(message))
