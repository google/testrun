# Image name: test-run/dhcp-primary
FROM test-run/base:latest

# Install dhcp server
RUN apt-get install -y isc-dhcp-server radvd

# Copy over all configuration files
COPY network/modules/dhcp-2/conf /testrun/conf

# Copy over all binary files
COPY network/modules/dhcp-2/bin /testrun/bin

# Copy over all python files
COPY network/modules/dhcp-2/python /testrun/python
