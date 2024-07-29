# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License
"""gRPC client module for the secondary DHCP Server"""
import grpc
import host.grpc_pb2_grpc as pb2_grpc
import host.grpc_pb2 as pb2

DEFAULT_PORT = '5001'
DEFAULT_HOST = 'external.localhost'  # Default DHCP2 server


class Client():
  """gRPC Client for the secondary DHCP server"""
  def __init__(self, port=DEFAULT_PORT, host=DEFAULT_HOST):
    self._port = port
    self._host = host

    # Create a gRPC channel to connect to the server
    self._channel = grpc.insecure_channel(self._host + ':' + self._port)

    # Create a gRPC stub
    self._stub = pb2_grpc.HostNetworkModuleStub(self._channel)

  def check_interface_status(self, iface_name):
    # Create a request message
    request = pb2.CheckInterfaceStatusRequest()
    request.iface_name = iface_name

    # Make the RPC call
    response = self._stub.CheckInterfaceStatus(request)

    return response

  def set_iface_down(self, iface_name):
    # Create a request message
    request = pb2.SetIfaceRequest()
    request.iface_name = iface_name

    # Make the RPC call
    response = self._stub.SetIfaceDown(request)

    return response

  def set_iface_up(self, iface_name):
    # Create a request message
    request = pb2.SetIfaceRequest()
    request.iface_name = iface_name

    # Make the RPC call
    response = self._stub.SetIfaceUp(request)

    return response
