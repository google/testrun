"""Intercepts network traffic between network services and the device
under test."""
from scapy.all import AsyncSniffer, DHCP, get_if_hwaddr
import logger
from network_event import NetworkEvent

LOGGER = logger.get_logger('listener')

DHCP_DISCOVER = 1
DHCP_OFFER = 2
DHCP_REQUEST = 3
DHCP_ACK = 5
CONTAINER_MAC_PREFIX = '9a:02:57:1e:8f'


class Listener:
  """Methods to start and stop the network listener."""

  def __init__(self, device_intf):
    self._device_intf = device_intf
    self._device_intf_mac = get_if_hwaddr(self._device_intf)

    self._sniffer = AsyncSniffer(
      iface=self._device_intf, prn=self._packet_callback)

    self._callbacks = []
    self._discovered_devices = []

  def start_listener(self):
    """Start sniffing packets on the device interface."""
    self._sniffer.start()

  def stop_listener(self):
    """Stop sniffing packets on the device interface."""
    self._sniffer.stop()

  def is_running(self):
    """Determine whether the sniffer is running."""
    return self._sniffer.running

  def register_callback(self, callback, events=[]):  # pylint: disable=dangerous-default-value
    """Register a callback for specified events."""
    self._callbacks.append(
      {
        'callback': callback,
        'events': events
      }
    )

  def _packet_callback(self, packet):

    # Ignore packets originating from our containers
    if packet.src.startswith(CONTAINER_MAC_PREFIX) or packet.src == self._device_intf_mac:
      return

    if not packet.src is None and packet.src not in self._discovered_devices:
      self._device_discovered(packet.src)

  def _get_dhcp_type(self, packet):
    return packet[DHCP].options[0][1]

  def _device_discovered(self, mac_addr):
    LOGGER.debug(f'Discovered device with address {mac_addr}')
    self._discovered_devices.append(mac_addr)

    for callback in self._callbacks:
      if NetworkEvent.DEVICE_DISCOVERED in callback['events']:
        callback['callback'](mac_addr)
