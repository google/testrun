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

# Image name: test-run/base
FROM ubuntu@sha256:e6173d4dc55e76b87c4af8db8821b1feae4146dd47341e4d431118c7dd060a74

RUN apt-get update

ARG MODULE_NAME=base
ARG MODULE_DIR=modules/network/$MODULE_NAME
ARG COMMON_DIR=framework/python/src/common

# Install common software
RUN DEBIAN_FRONTEND=noninteractive apt-get install -yq net-tools iputils-ping tzdata tcpdump iproute2 jq python3 python3-pip dos2unix

# Install common python modules
COPY $COMMON_DIR/ /testrun/python/src/common

# Setup the base python requirements
COPY $MODULE_DIR/python /testrun/python

# Install all python requirements for the module
RUN pip3 install -r /testrun/python/requirements.txt

# Add the bin files
COPY $MODULE_DIR/bin /testrun/bin

# Remove incorrect line endings
RUN dos2unix /testrun/bin/*

# Make sure all the bin files are executable
RUN chmod u+x /testrun/bin/*

#Start the network module
ENTRYPOINT [ "/testrun/bin/start_module" ]