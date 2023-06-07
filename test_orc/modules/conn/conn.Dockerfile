# Image name: test-run/conn-test
FROM test-run/base-test:latest

# Copy over all configuration files
COPY modules/conn/conf /testrun/conf

# Load device binary files
COPY modules/conn/bin /testrun/bin

# Copy over all python files
COPY modules/conn/python /testrun/python