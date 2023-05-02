# Image name: test-run/faux-dev
FROM test-run/base:latest

#Update and get all additional requirements not contained in the base image
RUN apt-get update --fix-missing

# NTP requireds interactive installation so we're going to turn that off
ARG DEBIAN_FRONTEND=noninteractive

# Install dhcp client and ntp client
RUN apt-get install -y isc-dhcp-client ntp ntpdate

# Copy over all configuration files
COPY network/devices/faux-dev/conf /testrun/conf

# Load device binary files
COPY network/devices/faux-dev/bin /testrun/bin

# Copy over all python files
COPY network/devices/faux-dev/python /testrun/python