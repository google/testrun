import proto.grpc_pb2_grpc as pb2_grpc
import proto.grpc_pb2 as pb2

from dhcp_config import DHCPConfig


class NetworkService(pb2_grpc.NetworkModule):

    def __init__(self):
        self._dhcp_config = DHCPConfig()

    """
		Resolve the current DHCP configuration and return
		the first range from the first subnet in the file
	"""

    def GetDHCPRange(self, request, context):
        self._dhcp_config.resolve_config()
        pool = self._dhcp_config._subnets[0]._pools[0]
        return pb2.DHCPRange(code=200, start=pool._range_start, end=pool._range_end)

    """
		Change DHCP configuration and set the 
		the first range from the first subnet in the configuration
	"""

    def SetDHCPRange(self, request, context):
        print("Setting DHCPRange")
        print("Start: " + request.start)
        print("End: " + request.end)
        self._dhcp_config.resolve_config()
        self._dhcp_config.set_range(request.start, request.end, 0, 0)
        self._dhcp_config.write_config()
        return pb2.Response(code=200, message="DHCP Range Set")

    """
		Return the current status of the network module
	"""

    def GetStatus(self, request, context):
        # ToDo: Figure out how to resolve the current DHCP status
        dhcpStatus = True
        message = str({"dhcpStatus":dhcpStatus})
        return pb2.Response(code=200, message=message)
