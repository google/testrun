"""Track device object information."""
from dataclasses import dataclass

@dataclass
class Device:
    """Represents a physical device and it's configuration."""

    make: str
    model: str
    mac_addr: str
