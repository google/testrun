# Image name: test-run/dhcp-primary
FROM test-run/base:latest

ARG MODULE_NAME=dhcp-1
ARG MODULE_DIR=modules/network/$MODULE_NAME

# Install dhcp server
RUN apt-get install -y isc-dhcp-server radvd

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python
