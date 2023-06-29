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