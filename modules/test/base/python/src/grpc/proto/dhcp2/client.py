import grpc
import grpc_pb2_grpc as pb2_grpc
import grpc_pb2 as pb2

DEFAULT_PORT = '5001'
DEFAULT_HOST = '10.10.10.3'  # Default DHCP2 server


class Client():

  def __init__(self, port=DEFAULT_PORT, host=DEFAULT_HOST):
    self._port = port
    self._host = host

    # Create a gRPC channel to connect to the server
    self._channel = grpc.insecure_channel(self._host + ':' + self._port)

    # Create a gRPC stub
    self._stub = pb2_grpc.NetworkModuleStub(self._channel)

  def add_reserved_lease(self, hostname, hw_addr, ip_addr):
    # Create a request message
    request = pb2.AddReservedLeaseRequest()
    request.hostname = hostname
    request.hw_addr = hw_addr
    request.ip_addr = ip_addr

    # Make the RPC call
    response = self._stub.AddReservedLease(request)

    return response

  def delete_reserved_lease(self, hw_addr):
    # Create a request message
    request = pb2.DeleteReservedLeaseRequest()
    request.hw_addr = hw_addr

    # Make the RPC call
    response = self._stub.DeleteReservedLease(request)

    return response

  def disable_failover(self):
    # Create a request message
    request = pb2.DisableFailoverRequest()

    # Make the RPC call
    response = self._stub.DisableFailover(request)

    return response

  def enable_failover(self):
    # Create a request message
    request = pb2.EnableFailoverRequest()

    # Make the RPC call
    response = self._stub.EnableFailover(request)

    return response

  def get_dhcp_range(self):
    # Create a request message
    request = pb2.GetDHCPRangeRequest()

    # Make the RPC call
    response = self._stub.GetDHCPRange(request)

    return response

  def get_lease(self,hw_addr):
    # Create a request message
    request = pb2.GetLeaseRequest()
    request.hw_addr=hw_addr

    # Make the RPC call
    response = self._stub.GetLease(request)

    return response

  def get_status(self):
    # Create a request message
    request = pb2.GetStatusRequest()

    # Make the RPC call
    response = self._stub.GetStatus(request)

    return response

  def stop_dhcp_server(self):
    # Create a request message
    request = pb2.StopDHCPServerRequest()

    # Make the RPC call
    response = self._stub.StopDHCPServer(request)

    return response


  def set_dhcp_range(self,start,end):
    # Create a request message
    request = pb2.SetDHCPRangeRequest()
    request.start=start
    request.end=end

    # Make the RPC call
    response = self._stub.SetDHCPRange(request)

    return response
