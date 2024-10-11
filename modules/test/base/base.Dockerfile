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

# Builder stage
# Image name: testrun/base-test
FROM python:3.10-slim AS builder

ARG MODULE_NAME=base
ARG MODULE_DIR=modules/test/$MODULE_NAME
ARG COMMON_DIR=framework/python/src/common

# Install additional requirements needed to build python packages
RUN apt-get update && \
	apt-get install -y gcc dos2unix

# Create the virtual environment
RUN python -m venv /opt/venv

# Activate the virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# Install common python modules
COPY $COMMON_DIR/ /testrun/python/src/common

# Setup the base python requirements
COPY $MODULE_DIR/python /testrun/python

# Install all python requirements for the module
RUN pip install -r /testrun/python/requirements.txt

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Remove incorrect line endings
RUN dos2unix /testrun/bin/*

# Make sure all the bin files are executable
RUN chmod u+x /testrun/bin/*

# Copy over all network module gRPC proto files
ARG NET_MODULE_DIR=modules/network
ARG NET_MODULE_PROTO_DIR=python/src/grpc_server/proto/grpc.proto
ARG CONTAINER_PROTO_DIR=testrun/python/src/grpc_server/proto

COPY $NET_MODULE_DIR/dhcp-1/$NET_MODULE_PROTO_DIR $CONTAINER_PROTO_DIR/dhcp1/
COPY $NET_MODULE_DIR/dhcp-2/$NET_MODULE_PROTO_DIR $CONTAINER_PROTO_DIR/dhcp2/
COPY $NET_MODULE_DIR/host/$NET_MODULE_PROTO_DIR $CONTAINER_PROTO_DIR/host/

# Copy the cached version of oui.txt incase the download fails
RUN mkdir -p /usr/local/etc
COPY $MODULE_DIR/usr/local/etc/oui.txt /usr/local/etc/oui.txt

# Update the oui.txt file from ieee
RUN wget https://standards-oui.ieee.org/oui.txt -O /usr/local/etc/oui.txt || echo "Unable to update the MAC OUI database"

# Operational stage
FROM python:3.10-slim

# Install common software
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -yq net-tools iputils-ping tzdata tcpdump iproute2 jq dos2unix nmap wget --fix-missing

# Get the virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy over all testrun files from the builder stage
COPY --from=builder /testrun /testrun
COPY --from=builder /usr/local/etc/oui.txt /usr/local/etc/oui.txt

# Activate the virtual environment by setting the PATH
ENV PATH="/opt/venv/bin:$PATH"

# Start the test module
ENTRYPOINT [ "/testrun/bin/start" ]