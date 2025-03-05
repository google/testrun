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
import json
from common import util
import os
from BAC0.core.io.IOExceptions import (UnknownPropertyError,
                                       ReadPropertyException,
                                       NoResponseFromController,
                                       DeviceNotConnected)

LOGGER = None
BAC0_LOG = '/root/.BAC0/BAC0.log'
DEFAULT_CAPTURES_DIR = '/runtime/output'
DEFAULT_CAPTURE_FILE = 'protocol.pcap'
DEFAULT_BIN_DIR = '/testrun/bin'

class BACnet():
  """BACnet Test module"""

  def __init__(self,
               log,
               captures_dir=DEFAULT_CAPTURES_DIR,
               capture_file=DEFAULT_CAPTURE_FILE,
               bin_dir=DEFAULT_BIN_DIR,
               device_hw_addr=None):
    # Set the log
    global LOGGER
    LOGGER = log

    # Setup the BAC0 Log
    BAC0.log_level(log_file=logging.DEBUG,
                   stdout=logging.INFO,
                   stderr=logging.CRITICAL)

    self._captures_dir = captures_dir
    self._capture_file = capture_file
    self._bin_dir = bin_dir
    self.device_hw_addr = device_hw_addr
    self.devices = []
    self.bacnet = None
    self._bin_dir = bin_dir

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
    LOGGER.info('BACnet devices found: ' + str(len(self.devices)))

  # Check if the device being tested is in the discovered devices list
  # discover needs to be called before this method is invoked
  def validate_device(self):
    result = None
    description = ''
    try:
      if len(self.devices) > 0:
        result = True
        for device in self.devices:
          object_id = str(device[3])  # BACnet Object ID
          LOGGER.info('Checking device: ' + str(device))
          device_valid = self.validate_bacnet_source(
              object_id=object_id, device_hw_addr=self.device_hw_addr)
          if device_valid is not None:
            result &= device_valid
        description = ('BACnet device discovered' if result else
                       'BACnet device was found but was not device under test')
      else:
        result = 'Feature Not Detected'
        description = 'BACnet device could not be discovered'
      LOGGER.info(description)
    except Exception: # pylint: disable=W0718
      LOGGER.error('Error occurred when validating device', exc_info=True)
    return result, description


  def validate_protocol_version(self, device_ip, device_id):
    LOGGER.info(f'Resolving protocol version for BACnet device: {device_id}')
    try:
      version = self.bacnet.read(
          f'{device_ip} device {device_id} protocolVersion')
      revision = self.bacnet.read(
          f'{device_ip} device {device_id} protocolRevision')
      protocol_version = f'{version}.{revision}'
      result = True
      result_description = f'Device uses BACnet version {protocol_version}'
    except (UnknownPropertyError, ReadPropertyException,
            NoResponseFromController, DeviceNotConnected) as e:
      result = False
      result_description = f'Failed to resolve protocol version {e}'
      LOGGER.error(result_description)
    return result, result_description

  # Validate that all traffic to/from BACnet device from
  # discovered object id matches the MAC address of the device
  def validate_bacnet_source(self, object_id, device_hw_addr):
    try:
      LOGGER.info(f'Checking BACnet traffic for object id {object_id}')
      capture_file = os.path.join(self._captures_dir, self._capture_file)
      packets = self.get_bacnet_packets(capture_file, object_id)
      valid = None
      # If no packets are found in protocol.pcap
      if not packets:
        LOGGER.debug(f'No BACnet packets found for object id {object_id}')
      for packet in packets:
        if object_id in packet['_source']['layers']['bacapp.instance_number']:
          if device_hw_addr.lower() in packet['_source']['layers']['eth.src']:
            LOGGER.debug('BACnet detected from device')
            valid = True if valid is None else valid and True
          elif device_hw_addr.lower() in packet['_source']['layers']['eth.dst']:
            LOGGER.debug('BACnet detected to device')
            valid = valid = True if valid is None else valid and True
          else:
            LOGGER.debug('BACnet detected for wrong MAC address')
            src = packet['_source']['layers']['eth.src'][0]
            dst = packet['_source']['layers']['eth.dst'][0]
            LOGGER.debug(f'From: {src} To: {dst} Expected: {device_hw_addr}')
            valid = False
      return valid
    except Exception: # pylint: disable=W0718
      LOGGER.error('Error occurred when validating source', exc_info=True)
      return False

  def get_bacnet_packets(self, capture_file, object_id):
    bin_file = self._bin_dir + '/get_bacnet_packets.sh'
    args = f'"{capture_file}" {object_id}'
    command = f'{bin_file} {args}'
    response = util.run_command(command)
    return json.loads(response[0].strip())
