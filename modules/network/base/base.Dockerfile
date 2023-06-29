# Image name: test-run/base
FROM ubuntu:jammy

ARG MODULE_NAME=base
ARG MODULE_DIR=modules/network/$MODULE_NAME
ARG COMMON_DIR=framework/python/src/common

# Install common software
RUN apt-get update && apt-get install -y net-tools iputils-ping tcpdump iproute2 jq python3 python3-pip dos2unix

# Install common python modules
COPY $COMMON_DIR/ /testrun/python/src/common

# Setup the base python requirements
COPY $MODULE_DIR/python /testrun/python

# Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt

# Add the bin files
COPY $MODULE_DIR/bin /testrun/bin

# Remove incorrect line endings
RUN dos2unix /testrun/bin/*

# Make sure all the bin files are executable
RUN chmod u+x /testrun/bin/*

#Start the network module
ENTRYPOINT [ "/testrun/bin/start_module" ]