"""Track device object information."""
from dataclasses import dataclass
from network_device import NetworkDevice


@dataclass
class Device(NetworkDevice):
  """Represents a physical device and it's configuration."""

  make: str = None
  model: str = None
  test_modules: str = None
