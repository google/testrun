# Image name: test-run/dhcp-primary
FROM test-run/base:latest

# Copy over all configuration files
COPY network/modules/template/conf /testrun/conf

# Load device binary files
COPY network/modules/template/bin /testrun/bin

# Copy over all python files
COPY network/modules/template/python /testrun/python