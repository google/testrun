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

"""Base class for starting the gRPC server for a network module."""
from concurrent import futures
import grpc
import proto.grpc_pb2_grpc as pb2_grpc
from network_service import NetworkService
import argparse

DEFAULT_PORT = '5001'


def serve(port):
  server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
  pb2_grpc.add_NetworkModuleServicer_to_server(NetworkService(), server)
  server.add_insecure_port('[::]:' + port)
  server.start()
  server.wait_for_termination()


def run():
  parser = argparse.ArgumentParser(
      description='GRPC Server for Network Module',
      formatter_class=argparse.ArgumentDefaultsHelpFormatter)
  parser.add_argument('-p',
                      '--port',
                      default=DEFAULT_PORT,
                      help='Define the default port to run the server on.')

  args = parser.parse_args()

  port = args.port

  print('gRPC server starting on port ' + port)
  serve(port)

if __name__ == '__main__':
  run()
