# Image name: test-run/ntp-test
FROM ubuntu@sha256:e6173d4dc55e76b87c4af8db8821b1feae4146dd47341e4d431118c7dd060a74

RUN apt-get update && apt-get upgrade -y && apt-get dist-upgrade -y

# Set DEBIAN_FRONTEND to noninteractive mode
ENV DEBIAN_FRONTEND=noninteractive

ARG MODULE_DIR=modules/test
ARG UNIT_TEST_DIR=testing/unit
ARG FRAMEWORK_DIR=framework

# Install common software
RUN apt-get install -yq net-tools iputils-ping tzdata tcpdump iproute2 jq python3 python3-pip dos2unix nmap wget --fix-missing

# Install framework python modules
COPY $FRAMEWORK_DIR/ /testrun/$FRAMEWORK_DIR

# Load all the test modules
COPY $MODULE_DIR/ /testrun/$MODULE_DIR
COPY $UNIT_TEST_DIR /testrun/$UNIT_TEST_DIR

# Install required software for TLS module
RUN apt-get update && apt-get install -y tshark

# Install all python requirements for framework
RUN pip3 install -r /testrun/framework/requirements.txt

# Install all python requirements for the TLS module
RUN pip3 install -r /testrun/modules/test/tls/python/requirements.txt

# Remove incorrect line endings
RUN dos2unix /testrun/modules/test/tls/bin/*
RUN dos2unix /testrun/testing/unit/*

# Make sure all the bin files are executable
RUN chmod u+x /testrun/modules/test/tls/bin/*
RUN chmod u+x /testrun/testing/unit/run_tests.sh

WORKDIR /testrun/testing/unit/

#ENTRYPOINT [ "./run_tests.sh" ]