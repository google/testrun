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

"""Cyclically probes the device interface with ARP requests so that a device
under test configured with a static IP address (instead of using DHCP) can be
detected during the 'waiting' phase.

The prober only sends requests. Responses are detected by the existing network
Listener, which fires an ARP_RESPONSE network event. This keeps a single packet
receive path (the Listener) and avoids introducing additional sniffers."""
import threading
from scapy.all import ARP, Ether, sendp
from common import logger

LOGGER = logger.get_logger('arp_prober')

# Mandated static IP address for devices that do not support DHCP. This falls
# within the network range used by Testrun (10.10.10.0/24). Must stay in sync with
# modules/test/conn/python/src/connection_module.py.STATIC_IP_ADDRESS.
STATIC_IP_ADDRESS = '10.10.10.100'

# Source identity for the probes. The probes are sent as the gateway network
# container.
ARP_PROBE_SRC_MAC = '9a:02:57:1e:8f:01'
ARP_PROBE_SRC_IP = '10.10.10.1'

# Interval, in seconds, between successive ARP probes.
ARP_PROBE_INTERVAL = 1


class ArpProber:
  """Periodically sends ARP requests for the mandated static IP address on the
  device interface, for the duration of the 'waiting' phase."""

  def __init__(self,
               device_intf,
               target_ip=STATIC_IP_ADDRESS,
               src_mac=ARP_PROBE_SRC_MAC,
               src_ip=ARP_PROBE_SRC_IP,
               interval=ARP_PROBE_INTERVAL):
    self._device_intf = device_intf
    self._target_ip = target_ip
    self._src_mac = src_mac
    self._src_ip = src_ip
    self._interval = interval

    self._stop_event = threading.Event()
    self._thread = None

    # A traditional broadcast ARP request ('who-has target_ip') sourced from a
    # recognised network container.
    self._probe = (
        Ether(src=self._src_mac, dst='ff:ff:ff:ff:ff:ff') /
        ARP(op=1,
            hwsrc=self._src_mac,
            psrc=self._src_ip,
            pdst=self._target_ip))

  def is_running(self):
    """Determine whether the prober thread is active."""
    return self._thread is not None and self._thread.is_alive()

  def start(self):
    """Start cyclically probing for the static IP address."""
    if self.is_running():
      LOGGER.debug('ARP prober was already running')
      return
    self._stop_event.clear()
    self._thread = threading.Thread(target=self._probe_loop,
                                    name='ARP prober',
                                    daemon=True)
    self._thread.start()
    LOGGER.debug(
        f'Started ARP prober for {self._target_ip} on {self._device_intf}')

  def stop(self):
    """Stop probing."""
    self._stop_event.set()
    thread = self._thread
    # Never join from within the prober thread itself.
    if thread is not None and thread is not threading.current_thread():
      thread.join(timeout=self._interval + 1)
      LOGGER.debug('Stopped the ARP prober')
    self._thread = None

  def _probe_loop(self):
    while not self._stop_event.is_set():
      try:
        sendp(self._probe, iface=self._device_intf, verbose=False)
      except Exception as e:  # pylint: disable=W0703
        LOGGER.error(f'Error sending ARP probe: {e}')
      # Interruptible wait so stop() takes effect promptly.
      self._stop_event.wait(self._interval)
