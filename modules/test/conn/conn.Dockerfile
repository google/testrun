# Image name: test-run/conn-test
FROM test-run/base-test:latest

ARG MODULE_NAME=conn
ARG MODULE_DIR=modules/test/$MODULE_NAME
ARG GRPC_PROTO_DIR=/testrun/python/src/grpc/proto/dhcp
ARG GRPC_PROTO_FILE="grpc.proto"

# Install all necessary packages
RUN apt-get install -y wget

#Update the oui.txt file from ieee
RUN wget http://standards-oui.ieee.org/oui.txt -P /usr/local/etc/

#Load the requirements file
COPY $MODULE_DIR/python/requirements.txt /testrun/python

#Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python


# Set the PYTHONPATH to include the "src" directory
ARG ROOT_SRC_DIR="/testrun/python/src"
ARG GRPC_SRC_DIR="/testrun/python/src/grpc"
ARG PROTO_GRPC_SRC_DIR="/testrun/python/src/grpc/proto"
ARG DHCP_GRPC_SRC_DIR="/testrun/python/src/grpc/proto/dhcp"

ENV PYTHONPATH=$ROOT_SRC_DIR:$GRPC_SRC_DIR:$PROTO_GRPC_SRC_DIR:$DHCP_GRPC_SRC_DIR

ARG GRPC_PROTO_DIR="proto/dhcp"
ARG GRPC_PROTO_FILE="grpc.proto"

# Copy over the required network module grpc proto files
COPY modules/network/dhcp-1/python/src/grpc/proto/grpc.proto testrun/python/src/grpc/proto/dhcp/


# Move into the grpc directory
WORKDIR $GRPC_SRC_DIR

# Build the grpc proto file every time before starting server
RUN python3 -m grpc_tools.protoc --proto_path=. ./$GRPC_PROTO_DIR/$GRPC_PROTO_FILE --python_out=. --grpc_python_out=.

WORKDIR ..

