# Image name: test-run/dhcp-primary
FROM test-run/base:latest

ARG MODULE_NAME=dhcp-1
ARG MODULE_DIR=modules/network/$MODULE_NAME

# Install all necessary packages
RUN apt-get install -y wget

#Update the oui.txt file from ieee
RUN wget http://standards-oui.ieee.org/oui.txt -P /usr/local/etc/

# Install dhcp server
RUN apt-get install -y isc-dhcp-server radvd

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python
