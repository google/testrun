# Image name: test-run/base
FROM ubuntu:jammy

# Install common software
RUN apt-get update && apt-get install -y net-tools iputils-ping tcpdump iproute2 jq python3 python3-pip dos2unix

#Setup the base python requirements
COPY network/modules/base/python /testrun/python

# Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt

# Add the bin files
COPY network/modules/base/bin /testrun/bin

# Remove incorrect line endings
RUN dos2unix /testrun/bin/*

# Make sure all the bin files are executable
RUN chmod u+x /testrun/bin/*

#Start the network module
ENTRYPOINT [ "/testrun/bin/start_module" ]