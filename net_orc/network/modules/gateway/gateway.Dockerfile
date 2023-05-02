# Image name: test-run/gateway
FROM test-run/base:latest

# Install required packages
RUN apt-get install -y iptables isc-dhcp-client

# Copy over all configuration files
COPY network/modules/gateway/conf /testrun/conf

# Copy over all binary files
COPY network/modules/gateway/bin /testrun/bin
