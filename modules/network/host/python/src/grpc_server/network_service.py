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
"""gRPC Network Service for the Host network module"""
import proto.grpc_pb2_grpc as pb2_grpc
import proto.grpc_pb2 as pb2

import traceback
from common import logger
from common import util

LOG_NAME = 'network_service'
LOGGER = None


class NetworkService(pb2_grpc.HostNetworkModule):
  """gRPC endpoints for the Host container"""

  def __init__(self):
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'host')

  def CheckInterfaceStatus(self, request, context):  # pylint: disable=W0613
    try:
      status = self.check_interface_status(request.iface_name)
      return pb2.CheckInterfaceStatusResponse(code=200, status=status)
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to read iface status: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
    return pb2.CheckInterfaceStatusResponse(code=500, status=False)

  def GetIfaceConnectionStats(self, request, context):  # pylint: disable=W0613
    try:
      stats = self.get_iface_connection_stats(request.iface_name)
      return pb2.GetIfaceStatsResponse(code=200, stats=stats)
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to read connection stats: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
    return pb2.GetIfaceStatsResponse(code=500, stats=False)

  def GetIfacePortStats(self, request, context):  # pylint: disable=W0613
    try:
      stats = self.get_iface_port_stats(request.iface_name)
      return pb2.GetIfaceStatsResponse(code=200, stats=stats)
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to read port stats: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
    return pb2.GetIfaceStatsResponse(code=500, stats=False)

  def SetIfaceDown(self, request, context):  # pylint: disable=W0613
    try:
      success = self.set_interface_down(request.iface_name)
      return pb2.SetIfaceResponse(code=200, success=success)
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to set interface down: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
    return pb2.SetIfaceResponse(code=500, success=False)

  def SetIfaceUp(self, request, context):  # pylint: disable=W0613
    try:
      success = self.set_interface_up(request.iface_name)
      return pb2.SetIfaceResponse(code=200, success=success)
    except Exception as e:  # pylint: disable=W0718
      fail_message = 'Failed to set interface up: ' + str(e)
      LOGGER.error(fail_message)
      LOGGER.error(traceback.format_exc())
    return pb2.SetIfaceResponse(code=500, success=False)

  def check_interface_status(self, interface_name):
    output = util.run_command(cmd=f'ip link show {interface_name}', output=True)
    if 'state DOWN ' in output[0]:
      return False
    else:
      return True

  def get_iface_connection_stats(self, iface):
    """Extract information about the physical connection"""
    response = util.run_command(f'ethtool {iface}')
    if len(response[1]) == 0:
      return response[0]
    else:
      return None

  def get_iface_port_stats(self, iface):
    """Extract information about packets connection"""
    response = util.run_command(f'ethtool -S {iface}')
    if len(response[1]) == 0:
      return response[0]
    else:
      return None

  def set_interface_up(self, interface_name):
    """Set the interface to the up state"""
    response = util.run_command('ip link set dev ' + interface_name + ' up')
    if len(response[1]) == 0:
      return response[0]
    else:
      return None

  def set_interface_down(self, interface_name):
    """Set the interface to the up state"""
    response = util.run_command('ip link set dev ' + interface_name + ' down')
    if len(response[1]) == 0:
      return response[0]
    else:
      return None
