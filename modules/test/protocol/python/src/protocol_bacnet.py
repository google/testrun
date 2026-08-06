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

import asyncio
import BAC0
from dataclasses import dataclass
import logging
import socket
import json
from common import util
import os
from bacpypes3.pdu import Address
from bacpypes3.apdu import IAmRequest
from bacpypes3.primitivedata import ObjectIdentifier

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
    self.bacnet = BAC0.lite(local_ip)
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
    self.devices = []
    if self.bacnet.discoveredDevices is not None:
      for device_info in self.bacnet.discoveredDevices.values():
        self.devices.append(
          BACnetDevice(
              device_id=str(device_info['object_instance'][1]),
              ip=str(device_info['address'])
            )
          )
    if self.devices:
      LOGGER.info('BACnet devices found: ' + str(len(self.devices)))
      return
    else:
      msg = 'Trying to discover BACnet device using direct whois request'
      LOGGER.info(msg)
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
    if self.devices:
      LOGGER.info('BACnet devices found: ' + str(len(self.devices)))
      return
    else:
      self.devices = self._discover_from_packets(device_ip)
    if self.devices:
      LOGGER.info('BACnet devices found: ' + str(len(self.devices)))
    else:
      LOGGER.info('No BACnet devices found')

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
    version = None
    revision = None
    result = False
    result_description = 'Failed to resolve protocol version.'
    ip = device.ip
    d_id = device.device_id
    LOGGER.info(f'Resolving protocol version for BACnet device: {d_id}')
    try:
      LOGGER.info('Step 1: Attempting via BAC0 with read_property...')
      dut = await BAC0.device(ip, d_id, self.bacnet)
      version = await dut.read_property(('device', d_id, 'protocolVersion'))
      revision = await dut.read_property(('device', d_id, 'protocolRevision'))
      if version is  None and revision is None:
        LOGGER.info('Failed to resolve version with read_property.')
    except Exception:
      msg = 'Failed to resolve version with read_property.'
      LOGGER.error(msg)
    if version is None or revision is None:
      LOGGER.info('Step 2: Attempting via BAC0 with IAmRequest injection...')
      try:
        iam_packet = IAmRequest(
            iAmDeviceIdentifier=ObjectIdentifier(('device', int(d_id))),
            maxAPDULengthAccepted=1476,
            segmentationSupported=3,
            vendorID=0
        )
        iam_packet.pduSource = Address(device.ip)
        app = self.bacnet.this_application.app
        await app.device_info_cache.set_device_info(iam_packet)
        cmd = f'{ip} device {d_id} protocolVersion protocolRevision'
        results = await self.bacnet.readMultiple(cmd)
        if isinstance(results, list) and len(results) == 2:
          version, revision = results[0], results[1]
        elif isinstance(results, dict):
          version = results.get('protocolVersion')
          revision = results.get('protocolRevision')
        if version is None and revision is None:
          LOGGER.info('Failed to resolve version with IAmRequest injection.')
      except Exception:
        msg = 'Failed to resolve version with IAmRequest injection.'
        LOGGER.error(msg)
    if version is None or revision is None:
      LOGGER.info('Step 3: Starting raw Python UDP socket fallback...')
      self._stop_self_bacnet()
      await asyncio.sleep(3)
      try:
        loop = asyncio.get_running_loop()
        version, revision = await loop.run_in_executor(
          None,
          self._hex_socket_request,
          ip,
          int(d_id)
        )
      except Exception as close_err:
        LOGGER.error(f'Raw packet error: {close_err}')
    if version is not None and revision is not None:
      result = True
      result_description = f'Device uses BACnet version {version}.{revision}'
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
    """ Discover BACnet devices from packets in the capture file."""
    discovered = set()
    capture_file = os.path.join(self._captures_dir, self._capture_file)
    LOGGER.info(f'Discovering BACnet devices from packets in {capture_file}...')
    bin_file = self._bin_dir + '/get_i-am_bacnet_packets.sh'
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
    return [
      BACnetDevice(device_id=device_id, ip=ip)
      for device_id, ip in discovered
      ]


  def _clear_bacnet_caches(self):
    LOGGER.info('Clearing BACnet device caches...')
    if hasattr(self, 'bacnet') and self.bacnet:
      if (hasattr(self.bacnet, 'devices') and
          isinstance(self.bacnet.devices, dict)):
        self.bacnet.devices.clear()
        LOGGER.info('BAC0 device registry cleared.')
      try:
        if (hasattr(self.bacnet, 'this_application')
          and self.bacnet.this_application
          and hasattr(self.bacnet.this_application, 'app')):
          app = self.bacnet.this_application.app
          if hasattr(app, 'device_info_cache') and app.device_info_cache:
            cache = app.device_info_cache
            if hasattr(cache, 'clear'):
              cache.clear()
            elif hasattr(cache, '_cache') and isinstance(cache._cache, dict): # pylint: disable=protected-access
              cache._cache.clear() # pylint: disable=protected-access
            elif hasattr(cache, 'cache') and isinstance(cache.cache, dict):
              cache.cache.clear()
            LOGGER.info('bacpypes3 DeviceInfoCache cleared.')
      except Exception as e:
        LOGGER.error(f'Error while clearing bacpypes3 cache: {e}')

  def _stop_self_bacnet(self):
    if hasattr(self, 'bacnet') and self.bacnet:
      try:
        LOGGER.info('Stopping BAC0 instance to free up UDP port 47808...')
        if hasattr(self.bacnet, 'disconnect'):
          self.bacnet.disconnect()
        elif (hasattr(self.bacnet, 'this_application')
          and self.bacnet.this_application):
          self.bacnet.this_application.close()
        LOGGER.info('BAC0 stopped. Waiting for OS to release the socket...')
      except Exception as close_err:
        LOGGER.warning(f'Error during BAC0 shutdown: {close_err}')

  def _hex_socket_request(
      self,
      ip: str,
      device_id: int
    ) -> tuple[int | None, int | None]:
    version = None
    revision = None

    obj_id_int = (8 << 22) | device_id
    obj_bytes = obj_id_int.to_bytes(4, byteorder='big')

    req_version = bytearray([
        0x81, 0x0a, 0x00, 0x11,
        0x01, 0x04,
        0x00, 0x05, 0x01,
        0x0c,
        0x0c
    ])
    req_version.extend(obj_bytes)
    req_version.extend([0x19, 0x62])

    req_revision = bytearray([
        0x81, 0x0a, 0x00, 0x11,
        0x01, 0x04,
        0x00, 0x05, 0x02,
        0x0c,
        0x0c
    ])
    req_revision.extend(obj_bytes)
    req_revision.extend([0x19, 0x8b])

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(2.5)

    try:
      LOGGER.info(f'''Sending raw hex ReadProperty(protocolVersion)
                  to {ip}:47808''')
      sock.sendto(req_version, (ip, 47808))
      data, _ = sock.recvfrom(1024)

      idx = data.find(b'\x3e')
      if idx != -1 and len(data) > idx + 2:
        tag = data[idx+1]
        if tag == 0x21:
          version = data[idx+2]
        elif tag == 0x22 and len(data) > idx + 3:
          version = int.from_bytes(data[idx+2:idx+4], byteorder='big')

      LOGGER.info(f'RAW packet version {version}')

      LOGGER.info(f'''Sending raw hex ReadProperty(protocolRevision)
                  to {ip}:47808''')
      sock.sendto(req_revision, (ip, 47808))
      data, _ = sock.recvfrom(1024)

      idx = data.find(b'\x3e')
      if idx != -1 and len(data) > idx + 2:
        tag = data[idx+1]
        if tag == 0x21:
          revision = data[idx+2]
        elif tag == 0x22 and len(data) > idx + 3:
          revision = int.from_bytes(data[idx+2:idx+4], byteorder='big')
      LOGGER.info(f'RAW packet revision {revision}')

    except socket.timeout:
      LOGGER.error('Device did not respond to unicast request.')
    except Exception as e:
      LOGGER.error(f'Raw socket exception occurred: {e}')
    finally:
      sock.close()
    return version, revision

