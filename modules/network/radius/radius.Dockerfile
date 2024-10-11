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

# Image name: testrun/radius
FROM testrun/base:latest

ARG MODULE_NAME=radius
ARG MODULE_DIR=modules/network/$MODULE_NAME

# Install radius and git
RUN apt-get update && apt-get install -y openssl freeradius git

# Clone chewie from source.
RUN git clone --branch 0.0.25 https://github.com/faucetsdn/chewie

# Install chewie as Python module
# --break-system-packages flag used to bypass PEP668
RUN pip3 install --break-system-packages chewie/

EXPOSE 1812/udp
EXPOSE 1813/udp

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python

# Install all python requirements for the module
# --break-system-packages flag used to bypass PEP668
RUN pip3 install --break-system-packages -r /testrun/python/requirements.txt