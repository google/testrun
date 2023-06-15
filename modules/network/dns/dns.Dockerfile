# Image name: test-run/dns
FROM test-run/base:latest

ARG MODULE_NAME=dns
ARG MODULE_DIR=modules/network/$MODULE_NAME

#Update and get all additional requirements not contained in the base image
RUN apt-get update --fix-missing

#Install dnsmasq 
RUN apt-get install -y dnsmasq

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin
