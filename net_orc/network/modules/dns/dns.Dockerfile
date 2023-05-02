# Image name: test-run/dns
FROM test-run/base:latest

#Update and get all additional requirements not contained in the base image
RUN apt-get update --fix-missing

#Install dnsmasq 
RUN apt-get install -y dnsmasq

# Copy over all configuration files
COPY network/modules/dns/conf /testrun/conf

# Copy over all binary files
COPY network/modules/dns/bin /testrun/bin
