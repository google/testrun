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
"""Module to run all the BACnet related methods for testing"""

import BAC0
import logging
from BAC0.core.io.IOExceptions import (UnknownPropertyError,
                                       ReadPropertyException,
                                       NoResponseFromController,
                                       DeviceNotConnected)

LOGGER = None
BAC0_LOG = '/root/.BAC0/BAC0.log'


class BACnet():
  """BACnet Test module"""

  def __init__(self, log):
    # Set the log
    global LOGGER
    LOGGER = log

    # Setup the BAC0 Log
    BAC0.log_level(log_file=logging.DEBUG,
                   stdout=logging.INFO,
                   stderr=logging.CRITICAL)

    self.devices = []
    self.bacnet = None

  def discover(self, local_ip=None):
    LOGGER.info('Performing BACnet discovery...')
    self.bacnet = BAC0.lite(local_ip)
    LOGGER.info('Local BACnet object: ' + str(self.bacnet))
    try:
      self.bacnet.discover(global_broadcast=True)
    except Exception as e:  # pylint: disable=W0718
      LOGGER.error(e)
    LOGGER.info('BACnet discovery complete')
    with open(BAC0_LOG, 'r', encoding='utf-8') as f:
      bac0_log = f.read()
    LOGGER.info('BAC0 Log:\n' + bac0_log)

    self.devices = self.bacnet.devices

  # Check if the device being tested is in the discovered devices list
  def validate_device(self, local_ip, device_ip):
    LOGGER.info('Validating BACnet device: ' + device_ip)
    self.discover(local_ip + '/24')
    LOGGER.info('BACnet devices found: ' + str(len(self.devices)))
    if len(self.devices) > 0:
      result = ('Feature Not Detected',
                'Device did not respond to BACnet discovery')
      for device in self.devices:
        address = device[2]
        LOGGER.info('Checking device: ' + str(device))
        if device_ip in address:
          result = True, 'BACnet device discovered'
          break
    else:
      result = ('Feature Not Detected',
        'BACnet device could not be discovered')
    if result is not None:
      LOGGER.info(result[1])
    return result

  def validate_protocol_version(self, device_ip, device_id):
    LOGGER.info(f'Resolving protocol version for BACnet device: {device_id}')
    try:
      version = self.bacnet.read(
          f'{device_ip} device {device_id} protocolVersion')
      revision = self.bacnet.read(
          f'{device_ip} device {device_id} protocolRevision')
      protocol_version = f'{version}.{revision}'
      result = True
      result_description = (
          f'Device uses BACnet version {protocol_version}')
    except (UnknownPropertyError, ReadPropertyException,
            NoResponseFromController, DeviceNotConnected) as e:
      result = False
      result_description = f'Failed to resolve protocol version {e}'
      LOGGER.error(result_description)
    return result, result_description
