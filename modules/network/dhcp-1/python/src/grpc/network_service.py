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
# limitations under the License.
"""gRPC Network Service for the DHCP Server network module"""
import proto.grpc_pb2_grpc as pb2_grpc
import proto.grpc_pb2 as pb2

from dhcp_config import DHCPConfig
from dhcp_leases import DHCPLeases

import traceback


class NetworkService(pb2_grpc.NetworkModule):
  """gRPC endpoints for the DHCP Server"""

  def __init__(self):
    self._dhcp_config = None
    self.dhcp_leases = DHCPLeases()

  def _get_dhcp_config(self):
    if self._dhcp_config is None:
      self._dhcp_config = DHCPConfig()
      self._dhcp_config.resolve_config()
    return self._dhcp_config

  def AddReservedLease(self, request, context):  # pylint: disable=W0613
    print("Add Reserved Lease Called")
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.add_reserved_host(request.hostname,request.hw_addr,request.ip_addr)
      dhcp_config.write_config()
      print("Reserve Leased Added")
    except Exception as e:
      print("Failed: " + str(e))
      traceback.print_exc()
    return pb2.Response(code=200, message='{}')

    def DeleteReservedLease(self, request, context):  # pylint: disable=W0613
    print("Delete Reserved Lease Called")
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.delete_reserved_host(request.hw_addr)
      dhcp_config.write_config()
      print("Reserve Leased Deleted")
    except Exception as e:
      print("Failed: " + str(e))
      traceback.print_exc()
    return pb2.Response(code=200, message='{}')

  def DisableFailover(self, request, contest): # pylint: disable=W0613
    print("Disabling Failover")
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.disable_failover()
      dhcp_config.write_config()
      print("Failover Disabled")
    except Exception as e:
      print("Failed: " + str(e))
    return pb2.Response(code=200, message='{}')

  def EnableFailover(self, request, contest): # pylint: disable=W0613
    print("Enable Failover")
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.enable_failover()
      dhcp_config.write_config()
      print("Failover Enabled")
    except Exception as e:
      print("Failed: " + str(e))
    return pb2.Response(code=200, message='{}')

  def GetIPAddress(self, request, context):  # pylint: disable=W0613
    """
      Resolve the current DHCP leased address for the
      provided MAC address
    """
    lease = self.dhcp_leases.get_lease(request.hw_addr)
    if lease is not None:
      return pb2.Response(code=200, message=str(lease))
    else:
      return pb2.Response(code=200, message='{}')

  def GetDHCPRange(self, request, context):  # pylint: disable=W0613
    """
      Resolve the current DHCP configuration and return
      the first range from the first subnet in the file
    """
    pool = self.get_dhcp_config().subnets[0].pools[0]
    return pb2.DHCPRange(code=200, start=pool.range_start, end=pool.range_end)

  def SetDHCPRange(self, request, context):  # pylint: disable=W0613
    """
      Change DHCP configuration and set the 
      the first range from the first subnet in the configuration
    """

    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.set_range(request.start, request.end, 0, 0)
      dhcp_config.write_config()
      return pb2.Response(code=200, message='DHCP Range Set')
    except Exception as e:
      print("Failed: " + str(e))
      return pb2.Response(code=200, message='{}')

  def GetStatus(self, request, context):  # pylint: disable=W0613
    """
      Return the current status of the network module
    """
    # ToDo: Figure out how to resolve the current DHCP status
    dhcp_status = True
    message = str({'dhcpStatus': dhcp_status})
    return pb2.Response(code=200, message=message)
