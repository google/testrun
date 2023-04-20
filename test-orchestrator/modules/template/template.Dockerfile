# Image name: test-run/dhcp-primary
FROM test-run/base:latest

# Copy over all configuration files
COPY modules/template/conf /testrun/conf

# Load device binary files
COPY modules/template/bin /testrun/bin

# Copy over all python files
COPY modules/template/python /testrun/python