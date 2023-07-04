from pydantic import BaseModel

class SystemInterfaces(BaseModel):
  device_intf: str
  internet_intf: str
