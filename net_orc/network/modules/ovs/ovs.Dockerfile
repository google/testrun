# Image name: test-run/orchestrator
FROM test-run/base:latest

#Update and get all additional requirements not contained in the base image
RUN apt-get update --fix-missing

#Install openvswitch
RUN apt-get install -y openvswitch-switch

# Copy over all configuration files
COPY network/modules/ovs/conf /testrun/conf

# Copy over all binary files
COPY network/modules/ovs/bin /testrun/bin

# Copy over all python files
COPY network/modules/ovs/python /testrun/python

#Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt