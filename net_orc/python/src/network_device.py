"""Track device object information."""
from dataclasses import dataclass

@dataclass
class NetworkDevice:
  """Represents a physical device and it's configuration."""

  mac_addr: str
  ip_addr: str = None
