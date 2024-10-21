# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Image name: testrun/tls-test
FROM testrun/base-test:latest

# Set DEBIAN_FRONTEND to noninteractive mode
ENV DEBIAN_FRONTEND=noninteractive

# Install required software
RUN apt-get update && apt-get install -y tshark

ARG MODULE_NAME=tls
ARG MODULE_DIR=modules/test/$MODULE_NAME
ARG CERTS_DIR=local/root_certs

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

# Install all python requirements for the module
RUN pip install -r /testrun/python/requirements.txt

# Install all python requirements for the modules unit test
RUN pip install -r /testrun/python/requirements-test.txt

# Install all python requirements for the modules unit test
RUN pip3 install -r /testrun/python/requirements-test.txt

# Create a directory inside the container to store the root certificates
RUN mkdir -p /testrun/root_certs
