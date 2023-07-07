from pydantic import BaseModel
from api.system_network_config import SystemNetworkConfig

class SystemConfig(BaseModel):
  network: SystemNetworkConfig
