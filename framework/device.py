"""Track device object information."""

from network_device import NetworkDevice
from dataclasses import dataclass


@dataclass
class Device(NetworkDevice):
  """Represents a physical device and it's configuration."""

  make: str = None
  model: str = None
  mac_addr: str
  test_modules: str = None
