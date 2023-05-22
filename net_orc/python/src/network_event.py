"""Specify the various types of network events to be reported."""
from enum import Enum


class NetworkEvent(Enum):
  """All possible network events."""
  DEVICE_DISCOVERED = 1
  DEVICE_STABLE = 2
  DHCP_LEASE_ACK = 3
