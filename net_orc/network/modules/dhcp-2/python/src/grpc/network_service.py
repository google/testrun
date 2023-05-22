"""gRPC Network Service for the DHCP Server network module"""
import proto.grpc_pb2_grpc as pb2_grpc
import proto.grpc_pb2 as pb2

from dhcp_config import DHCPConfig


class NetworkService(pb2_grpc.NetworkModule):
  """gRPC endpoints for the DHCP Server"""

  def __init__(self):
    self._dhcp_config = DHCPConfig()

  def GetDHCPRange(self, request, context): # pylint: disable=W0613
    """
      Resolve the current DHCP configuration and return
      the first range from the first subnet in the file
    """
    self._dhcp_config.resolve_config()
    pool = self._dhcp_config.subnets[0].pools[0]
    return pb2.DHCPRange(code=200, start=pool.range_start, end=pool.range_end)

  def SetDHCPRange(self, request, context): # pylint: disable=W0613
    """
      Change DHCP configuration and set the 
      the first range from the first subnet in the configuration
    """

    print('Setting DHCPRange')
    print('Start: ' + request.start)
    print('End: ' + request.end)
    self._dhcp_config.resolve_config()
    self._dhcp_config.set_range(request.start, request.end, 0, 0)
    self._dhcp_config.write_config()
    return pb2.Response(code=200, message='DHCP Range Set')

  def GetStatus(self, request, context): # pylint: disable=W0613
    """
      Return the current status of the network module
    """
    # ToDo: Figure out how to resolve the current DHCP status
    dhcp_status = True
    message = str({'dhcpStatus': dhcp_status})
    return pb2.Response(code=200, message=message)
