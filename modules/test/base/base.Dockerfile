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

# Start the test module
ENTRYPOINT [ "/testrun/bin/start_module" ]