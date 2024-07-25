# Image name: test-run/ntp-test
FROM test-run/base-test:latest

ARG MODULE_NAME=ntp
ARG MODULE_DIR=modules/test/$MODULE_NAME

# Load the requirements file
COPY $MODULE_DIR/python/requirements.txt /testrun/python

# Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Remove incorrect line endings
RUN dos2unix /testrun/bin/*

# Make sure all the bin files are executable
RUN chmod u+x /testrun/bin/*

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python