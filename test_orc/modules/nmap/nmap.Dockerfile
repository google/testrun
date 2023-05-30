# Image name: test-run/baseline-test
FROM test-run/base-test:latest

# Copy over all configuration files
COPY modules/nmap/conf /testrun/conf

# Load device binary files
COPY modules/nmap/bin /testrun/bin

# Copy over all python files
COPY modules/nmap/python /testrun/python