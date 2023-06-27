# Image name: test-run/faux-dev
FROM test-run/base:latest

ARG MODULE_NAME=faux-dev
ARG MODULE_DIR=modules/devices/$MODULE_NAME

#Update and get all additional requirements not contained in the base image
RUN apt-get update --fix-missing

# NTP requireds interactive installation so we're going to turn that off
ARG DEBIAN_FRONTEND=noninteractive

# Install dhcp client and ntp client
RUN apt-get install -y isc-dhcp-client ntp ntpdate

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python