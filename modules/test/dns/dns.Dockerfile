# Image name: test-run/conn-test
FROM test-run/base-test:latest

ARG MODULE_NAME=dns
ARG MODULE_DIR=modules/test/$MODULE_NAME

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python