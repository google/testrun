# Image name: test-run/baseline-test
FROM test-run/base-test:latest

# Copy over all configuration files
COPY modules/baseline/conf /testrun/conf

# Load device binary files
COPY modules/baseline/bin /testrun/bin

# Copy over all python files
COPY modules/baseline/python /testrun/python