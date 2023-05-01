# Image name: test-run/baseline-test
FROM test-run/base-test:latest

# Copy over all configuration files
COPY modules/dns/conf /testrun/conf

# Load device binary files
COPY modules/dns/bin /testrun/bin

# Copy over all python files
COPY modules/dns/python /testrun/python