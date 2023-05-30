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
