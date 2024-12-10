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

"""Intercepts network traffic between network services and the device
under test."""
import threading
from scapy.all import AsyncSniffer, DHCP, get_if_hwaddr
from scapy.error import Scapy_Exception
from net_orc.network_event import NetworkEvent
from common import logger
import time

LOGGER = logger.get_logger('listener')

DHCP_DISCOVER = 1
DHCP_OFFER = 2
DHCP_REQUEST = 3
DHCP_ACK = 5
CONTAINER_MAC_PREFIX = '9a:02:57:1e:8f'


class Listener:
  """Methods to start and stop the network listener."""

  def __init__(self, session):
    self._session = session
    self._device_intf = self._session.get_device_interface()
    self._device_intf_mac = get_if_hwaddr(self._device_intf)

    self._sniffer = AsyncSniffer(iface=self._device_intf,
                                 prn=self._packet_callback)

    self._callbacks = []
    self._discovered_devices = []

  def start_listener(self):
    """Start sniffing packets on the device interface."""

    # Don't start the listener if it is already running
    if self.is_running():
      LOGGER.debug('Listener was already running')
      return

    self._sniffer.start()

  def reset(self):
    self._callbacks = []
    self._discovered_devices = []

  def stop_listener(self):
    """Stop sniffing packets on the device interface."""
    for _ in range(5):
      try:
        if self.is_running():
          self._sniffer.stop()
          break
      except Scapy_Exception as e:
        LOGGER.error(f'Error stopping the listener: {e}')
        time.sleep(1)
    else:
      LOGGER.error('Failed to stop the listener after 5 retries')

  def is_running(self):
    """Determine whether the sniffer is running."""
    return self._sniffer.running

  def register_callback(self, callback, events=[]):  # pylint: disable=dangerous-default-value
    """Register a callback for specified events."""
    self._callbacks.append({'callback': callback, 'events': events})

  def call_callback(self, net_event, *args):
    for callback in self._callbacks:
      if net_event in callback['events']:
        callback_thread = threading.Thread(target=callback['callback'],
                                           name='Callback thread',
                                           args=args)
        callback_thread.start()

  def _packet_callback(self, packet):

    # DHCP ACK callback
    if DHCP in packet and self._get_dhcp_type(packet) == DHCP_ACK:
      self.call_callback(NetworkEvent.DHCP_LEASE_ACK, packet)

    # New device discovered callback
    if not packet.src is None and packet.src not in self._discovered_devices:
      # Ignore packets originating from our containers
      if packet.src.startswith(
          CONTAINER_MAC_PREFIX) or packet.src == self._device_intf_mac:
        return
      self._discovered_devices.append(packet.src)
      self.call_callback(NetworkEvent.DEVICE_DISCOVERED, packet.src)

  def _get_dhcp_type(self, packet):
    return packet[DHCP].options[0][1]
