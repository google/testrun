"""Specify the various types of network events to be reported."""
from enum import Enum

class NetworkEvent(Enum):
  """All possible network events."""

  ALL = 0
  DEVICE_DISCOVERED = 1
  DHCP_LEASE_NEW = 2
  DHCP_LEASE_RENEWED = 3
