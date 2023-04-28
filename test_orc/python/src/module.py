"""Represemts a test module."""
from dataclasses import dataclass
from docker.models.containers import Container

@dataclass
class TestModule: # pylint: disable=too-few-public-methods,too-many-instance-attributes
  """Represents a test module."""

  name: str = None
  display_name: str = None
  description: str = None

  build_file: str = None
  container: Container = None
  container_name: str = None
  image_name :str  = None
  enable_container: bool = True

  timeout: int = 60

  # Absolute path
  dir: str = None
  dir_name: str = None
