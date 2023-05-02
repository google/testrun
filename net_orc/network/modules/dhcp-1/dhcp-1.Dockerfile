# Image name: test-run/dhcp-primary
FROM test-run/base:latest

# Install dhcp server
RUN apt-get install -y isc-dhcp-server radvd

# Copy over all configuration files
COPY network/modules/dhcp-1/conf /testrun/conf

# Copy over all binary files
COPY network/modules/dhcp-1/bin /testrun/bin
	
# Copy over all python files
COPY network/modules/dhcp-1/python /testrun/python
