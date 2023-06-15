# Image name: test-run/template
FROM test-run/base:latest

ARG MODULE_NAME=template
ARG MODULE_DIR=modules/network/$MODULE_NAME

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python