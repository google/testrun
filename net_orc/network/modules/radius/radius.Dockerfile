# Image name: test-run/radius
FROM test-run/base:latest

# Install radius and git
RUN apt-get update && apt-get install -y openssl freeradius git

# Clone chewie from source.
RUN git clone --branch 0.0.25 https://github.com/faucetsdn/chewie

# Install chewie as Python module
RUN pip3 install chewie/

EXPOSE 1812/udp
EXPOSE 1813/udp

# Copy over all configuration files
COPY network/modules/radius/conf /testrun/conf

# Copy over all binary files
COPY network/modules/radius/bin /testrun/bin

# Copy over all python files
COPY network/modules/radius/python /testrun/python

# Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt