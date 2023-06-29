# Image name: test-run/base-test
FROM ubuntu:jammy

ARG MODULE_NAME=base
ARG MODULE_DIR=modules/test/$MODULE_NAME

# Install common software
RUN apt-get update && apt-get install -y net-tools iputils-ping tcpdump iproute2 jq python3 python3-pip dos2unix nmap --fix-missing

# Setup the base python requirements
COPY $MODULE_DIR/python /testrun/python

# Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Remove incorrect line endings
RUN dos2unix /testrun/bin/*

# Make sure all the bin files are executable
RUN chmod u+x /testrun/bin/*

# Copy over all network module gRPC proto files
ARG NET_MODULE_DIR=modules/network
ARG NET_MODULE_PROTO_DIR=python/src/grpc/proto/grpc.proto
ARG CONTAINER_PROTO_DIR=testrun/python/src/grpc/proto

COPY $NET_MODULE_DIR/dhcp-1/$NET_MODULE_PROTO_DIR $CONTAINER_PROTO_DIR/dhcp1/
COPY $NET_MODULE_DIR/dhcp-2/$NET_MODULE_PROTO_DIR $CONTAINER_PROTO_DIR/dhcp2/

# Build all the gRPC proto files
ARG GRPC_DIR="/testrun/python/src/grpc"
ARG GRPC_PROTO_DIR="proto"
ARG GRPC_PROTO_FILE="grpc.proto"

# Move into the grpc directory
WORKDIR $GRPC_DIR

# Build the grpc proto file every time before starting server
RUN python3 -m grpc_tools.protoc --proto_path=. ./$GRPC_PROTO_DIR/dhcp1/$GRPC_PROTO_FILE --python_out=. --grpc_python_out=.

RUN python3 -m grpc_tools.protoc --proto_path=. ./$GRPC_PROTO_DIR/dhcp2/$GRPC_PROTO_FILE --python_out=. --grpc_python_out=.

WORKDIR ..

# Set the PYTHONPATH to include all the directories
ARG ROOT_SRC_DIR="/testrun/python/src"
ARG GRPC_SRC_DIR="/testrun/python/src/grpc"
ARG PROTO_GRPC_SRC_DIR="/testrun/python/src/grpc/proto"
ARG DHCP1_GRPC_SRC_DIR="/testrun/python/src/grpc/proto/dhcp1"
ARG DHCP2_GRPC_SRC_DIR="/testrun/python/src/grpc/proto/dhcp2"

ENV PYTHONPATH=$ROOT_SRC_DIR:$GRPC_SRC_DIR:$PROTO_GRPC_SRC_DIR:$DHCP1_GRPC_SRC_DIR:$DHCP2_GRPC_SRC_DIR

# Start the test module
ENTRYPOINT [ "/testrun/bin/start_module" ]