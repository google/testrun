# Image name: test-run/conn-test
FROM test-run/base-test:latest

# Install all necessary packages
RUN apt-get install -y wget

#Update the oui.txt file from ieee
RUN wget http://standards-oui.ieee.org/oui.txt -P /usr/local/etc/

#Load the requirements file
COPY modules/conn/python/requirements.txt /testrun/python

#Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt

# Copy over all configuration files
COPY modules/conn/conf /testrun/conf

# Load device binary files
COPY modules/conn/bin /testrun/bin

# Copy over all python files
COPY modules/conn/python /testrun/python
