# Image name: test-run/baseline-test
FROM test-run/base-test:latest

#Load the requirements file
COPY modules/nmap/python/requirements.txt /testrun/python

#Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt

# Copy over all configuration files
COPY modules/nmap/conf /testrun/conf

# Load device binary files
COPY modules/nmap/bin /testrun/bin

# Copy over all python files
COPY modules/nmap/python /testrun/python