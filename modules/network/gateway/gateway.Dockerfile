# Image name: test-run/gateway
FROM test-run/base:latest

ARG MODULE_NAME=gateway
ARG MODULE_DIR=modules/network/$MODULE_NAME

# Install required packages
RUN apt-get install -y iptables isc-dhcp-client

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin
