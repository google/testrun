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

# Image name: testrun/ntp-test
FROM testrun/base-test:latest

# Set DEBIAN_FRONTEND to noninteractive mode
ENV DEBIAN_FRONTEND=noninteractive

# Install required software
RUN apt-get update && apt-get install -y tshark

ARG MODULE_NAME=ntp
ARG MODULE_DIR=modules/test/$MODULE_NAME

# Load the requirements file
COPY $MODULE_DIR/python/requirements.txt /testrun/python

# Install all python requirements for the module
RUN pip install -r /testrun/python/requirements.txt

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python

# Copy Jinja template
COPY $MODULE_DIR/resources/report_template.jinja2 $REPORT_TEMPLATE_PATH/