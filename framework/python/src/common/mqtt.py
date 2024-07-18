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
from common import logger
from common import util

LOGGER = logger.get_logger("mgtt")


class MQTTException(Exception):
  def __init__(self, message: str) -> None:
    super().__init__(message)


class MQTT:
  """ MQTT client class
  """
  def __init__(self) -> None:
    self._mosquitto_host = util.get_docker_host_by_name("tr-ws")
    self._client = mqtt_client.Client(mqtt_client.CallbackAPIVersion.VERSION2)
    self._client.enable_logger(LOGGER)
    self._host = util.get_docker_host_by_name("tr-ws")

  def _connect(self):
    """Establish connection to Mosquitto server

    Raises:
      MQTTException: Raises exception on connection error
    """
    if not self._client.is_connected():
      try:
        self._client.connect(self._host, 1883, 60)
      except (ValueError, ConnectionRefusedError) as e:
        LOGGER.error("Can't connect to host")
        raise MQTTException("Connection to the Mosquitto server failed") from e

  def send_message(self, topic: str, message: t.Union[str, dict]) -> None:
    """Send message to specific topic

    Args:
        topic (str): mqtt topic
        message (t.Union[str, dict]): message
    """
    self._connect()
    if isinstance(message, dict):
      message = json.dumps(message)
    self._client.publish(topic, str(message))
