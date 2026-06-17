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
from bacpypes3.pdu import Address
from bacpypes3.app import DeviceInfo
from bacpypes3.basetypes import Segmentation
from dataclasses import dataclass
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


@dataclass
class BACnetDevice:
  device_id: str
  ip: str


class BACnet():
  """BACnet Test module"""
  devices: list[BACnetDevice] = []
  bacnet: BAC0.lite

  def __init__(self,
               log,
               device_hw_addr,
               captures_dir=DEFAULT_CAPTURES_DIR,
               capture_file=DEFAULT_CAPTURE_FILE,
               bin_dir=DEFAULT_BIN_DIR,
               ):
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
    self._bin_dir = bin_dir

  async def discover(self, local_ip, device_ip):
    LOGGER.info('Performing BACnet discovery...')
    self.devices = []
    self.bacnet = BAC0.connect(local_ip)
    LOGGER.info('Local BACnet object: ' + str(self.bacnet))
    try:
      await self.bacnet._discover(global_broadcast=True, timeout=10) # pylint: disable=protected-access
    except Exception as e: # pylint: disable=W0718
      LOGGER.error(e)
    LOGGER.info('BACnet discovery complete')
    with open(BAC0_LOG, 'r', encoding='utf-8') as f:
      bac0_log = f.read()
    LOGGER.info('BAC0 Log:\n' + bac0_log)
    # Extract discovered devices as a BACnetDevice.
    LOGGER.info('discoveredDevices: ' + str(self.bacnet.discoveredDevices))
    if self.bacnet.discoveredDevices is not None:
      for device_info in self.bacnet.discoveredDevices.values():
        device = BACnetDevice(
              device_id=str(device_info['object_instance'][1]),
              ip=str(device_info['address'])
            )
        LOGGER.info(f'Discovered BACnet device: {device}')
        self.devices.append(device)
    LOGGER.info('BACnet devices found: ' + str(len(self.devices)))
    if not self.devices:
      try:
        await self.bacnet._discover(timeout=10) # pylint: disable=protected-access
      except Exception as e: # pylint: disable=W0718
        LOGGER.error(e)
      LOGGER.info('BACnet discovery complete')
      with open(BAC0_LOG, 'r', encoding='utf-8') as f:
        bac0_log = f.read()
      LOGGER.info('BAC0 Log:\n' + bac0_log)
      LOGGER.info('discoveredDevices: ' + str(self.bacnet.discoveredDevices))
      if self.bacnet.discoveredDevices is not None:
        for device_info in self.bacnet.discoveredDevices.values():
          device = BACnetDevice(
                device_id=str(device_info['object_instance'][1]),
                ip=str(device_info['address'])
              )
          self.devices.append(device)
          LOGGER.info(f'Discovered BACnet device: {device}')
    if not self.devices:
      res = await self.bacnet.this_application.app.who_is(
          low_limit=0,
          high_limit=4194303,
          address=Address(f'{device_ip}:47808'),
          timeout=10,
      )
      for iam in res:
        instance = iam.iAmDeviceIdentifier[1]
        address = str(iam.pduSource)
        device = BACnetDevice(
                device_id=str(instance),
                ip=str(address)
              )
        self.devices.append(device)
    if not self.devices:
      self.devices = self._discover_from_packets(device_ip)

  # Check if the device being tested is in the discovered devices list
  # discover needs to be called before this method is invoked
  def validate_device(self):
    result = None
    description = ''

    try:
      if len(self.devices) > 0:
        result = True
        for device in self.devices:
          LOGGER.info(f'Checking device: {device.device_id}')
          device_valid = self.validate_bacnet_source(
              device=device, device_hw_addr=self.device_hw_addr)
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

  async def validate_protocol_version(
    self,
    device: BACnetDevice
  ) -> tuple[bool, str]:
    LOGGER.info(
      f'Resolving protocol version for BACnet device: {device.device_id}'
    )
    version = None
    revision = None
    try:
      dev_info = DeviceInfo()
      dev_info.device_instance = device.device_id
      dev_info.device_address = Address(device.ip)
      dev_info.max_apdu_length_accepted = 1476  # Стандарт для BACnet/IP
      dev_info.segmentation_supported = Segmentation.noSegmentation
      dev_info.vendor_id = 0
      
      await self.bacnet.this_application.app.device_info_cache.set_device_info(dev_info)
      LOGGER.info(f"Manually injected device {device.device_id} ({device.ip}) into BAC0 cache.")
    except Exception as cache_err:
      LOGGER.warning(f"Failed to pre-populate BAC0 cache: {cache_err}")
    try:
      ip = device.ip
      d_id = device.device_id
      cmd = f'{ip} device {d_id} protocolVersion protocolRevision'
      results = await self.bacnet.readMultiple(cmd)
      LOGGER.info(f'BACnet readMultiple results: {results}')
      if len(results) == 2:
        version = results[0]
        revision = results[1]
      if version is None or revision is None:
        result = False
        result_description = (
            f'Failed to resolve protocol version: version={version}, '
            f'revision={revision}')
        LOGGER.error(result_description)
      else:
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
  def validate_bacnet_source(
        self, device: BACnetDevice,
        device_hw_addr: str
      ) -> bool:
    try:
      LOGGER.info(f'Checking BACnet traffic for object id {device.device_id}')
      capture_file = os.path.join(self._captures_dir, self._capture_file)
      packets = self.get_bacnet_packets(capture_file, device)
      valid = None
      # If no packets are found in protocol.pcap
      if not packets:
        LOGGER.debug(
          f'No BACnet packets found for object id {device.device_id}'
          )
      for packet in packets:
        pakcet_bac = packet['_source']['layers']['bacapp.instance_number']
        if device.device_id in pakcet_bac:
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

  def get_bacnet_packets(
      self,
      capture_file: str,
      device: BACnetDevice
    ) -> list[dict]:
    bin_file = self._bin_dir + '/get_bacnet_packets.sh'
    args = f'"{capture_file}" {device.device_id}'
    command = f'{bin_file} {args}'
    response = util.run_command(command)
    return json.loads(response[0].strip())

  def _discover_from_packets(self, device_ip: str) -> list[BACnetDevice]:
    discovered = set()
    capture_file = os.path.join(self._captures_dir, self._capture_file)
    LOGGER.info(f'Discovering BACnet devices from packets in {capture_file}...')
    bin_file = self._bin_dir + '/get_bacnet_i-am_packets.sh'
    args = f'"{capture_file}" {device_ip}'
    command = f'{bin_file} {args}'
    response = util.run_command(command)
    packets = json.loads(response[0].strip())
    for packet in packets:
      info = packet['_source']['layers']['_ws.col.info'][0]
      if 'i-Am' in info:
        discovered.add(
          (
            packet['_source']['layers']['bacapp.instance_number'][0],
            packet['_source']['layers']['ip.src'][0]
           )
          )
    LOGGER.info(f'Discovered BACnet devices from packets: {discovered}')
    return [
      BACnetDevice(device_id=device_id, ip=ip)
      for device_id, ip in discovered
      ]
