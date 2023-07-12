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

from dhcp_server import DHCPServer
from dhcp_config import DHCPConfig
from dhcp_leases import DHCPLeases

import traceback
from common import logger

LOG_NAME = 'network_service'
LOGGER = None

class NetworkService(pb2_grpc.NetworkModule):
  """gRPC endpoints for the DHCP Server"""

  def __init__(self):
    self._dhcp_server = DHCPServer()
    self._dhcp_config = None
    self.dhcp_leases = DHCPLeases()
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-1')

  def _get_dhcp_config(self):
    if self._dhcp_config is None:
      self._dhcp_config = DHCPConfig()
      self._dhcp_config.resolve_config()
    return self._dhcp_config

  def RestartDHCPServer(self, request, context):  # pylint: disable=W0613
    LOGGER.info('Restarting DHCP server')
    try:
      started = self._dhcp_server.restart()
      LOGGER.info('DHCP server restarted: ' + (str(started)))
      return pb2.Response(code=200, message='{}')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to restart DHCP server: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def StartDHCPServer(self, request, context):  # pylint: disable=W0613
    LOGGER.info('Starting DHCP server')
    try:
      started = self._dhcp_server.start()
      LOGGER.info('DHCP server started: ' + (str(started)))
      return pb2.Response(code=200, message='{}')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to start DHCP server: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def StopDHCPServer(self, request, context):  # pylint: disable=W0613
    LOGGER.info('Stopping DHCP server')
    try:
      stopped = self._dhcp_server.stop()
      LOGGER.info('DHCP server stopped: ' + (str(stopped)))
      return pb2.Response(code=200, message='{}')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to stop DHCP server: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def AddReservedLease(self, request, context):  # pylint: disable=W0613
    LOGGER.info('Add reserved lease called')
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.add_reserved_host(request.hostname, request.hw_addr,
                                    request.ip_addr)
      dhcp_config.write_config()
      LOGGER.info('Reserved lease added')
      return pb2.Response(code=200, message='{}')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to add reserved lease: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def DeleteReservedLease(self, request, context):  # pylint: disable=W0613
    LOGGER.info('Delete reserved lease called')
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.delete_reserved_host(request.hw_addr)
      dhcp_config.write_config()
      LOGGER.info('Reserved lease deleted')
      return pb2.Response(code=200, message='{}')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to delete reserved lease: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def DisableFailover(self, request, contest):  # pylint: disable=W0613
    LOGGER.info('Disable failover called')
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.disable_failover()
      dhcp_config.write_config()
      LOGGER.info('Failover disabled')
      return pb2.Response(code=200, message='{}')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to disable failover: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def EnableFailover(self, request, contest):  # pylint: disable=W0613
    LOGGER.info('Enable failover called')
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.enable_failover()
      dhcp_config.write_config()
      LOGGER.info('Failover enabled')
      return pb2.Response(code=200, message='{}')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to enable failover: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def GetDHCPRange(self, request, context):  # pylint: disable=W0613
    """
      Resolve the current DHCP configuration and return
      the first range from the first subnet in the file
    """
    LOGGER.info('Get DHCP range called')
    try:
      pool = self._get_dhcp_config()._subnets[0].pools[0]
      return pb2.DHCPRange(code=200, start=pool.range_start, end=pool.range_end)
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to get DHCP range: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def GetLease(self, request, context):  # pylint: disable=W0613
    """
      Resolve the current DHCP leased address for the
      provided MAC address
    """
    LOGGER.info('Get lease called')
    try:
      lease = self.dhcp_leases.get_lease(request.hw_addr)
      if lease is not None:
        return pb2.Response(code=200, message=str(lease))
      else:
        return pb2.Response(code=200, message='{}')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to get lease: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def SetDHCPRange(self, request, context):  # pylint: disable=W0613
    """
      Change DHCP configuration and set the 
      the first range from the first subnet in the configuration
    """
    LOGGER.info('Set DHCP range called')
    try:
      dhcp_config = self._get_dhcp_config()
      dhcp_config.set_range(request.start, request.end, 0, 0)
      dhcp_config.write_config()
      LOGGER.info('DHCP range set')
      return pb2.Response(code=200, message='DHCP Range Set')
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to set DHCP range: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
      return pb2.Response(code=500, message=fail_message)

  def GetStatus(self, request, context):  # pylint: disable=W0613
    """
      Return the current status of the network module
    """
    dhcp_status = self._dhcp_server.is_running()
    message = str({'dhcpStatus': dhcp_status})
    return pb2.Response(code=200, message=message)
