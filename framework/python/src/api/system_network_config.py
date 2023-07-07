from pydantic import BaseModel

class SystemNetworkConfig(BaseModel):
  device_intf: str
  internet_intf: str
