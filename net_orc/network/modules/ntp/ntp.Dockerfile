# Image name: test-run/ntp
FROM test-run/base:latest

# Copy over all configuration files
COPY network/modules/ntp/conf /testrun/conf

# Copy over all binary files
COPY network/modules/ntp/bin /testrun/bin

# Copy over all python files
COPY network/modules/ntp/python /testrun/python

EXPOSE 123/udp
