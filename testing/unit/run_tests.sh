#!/bin/bash -e

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

# This script should be run from within the unit_test directory.  If
# it is run outside this directory, paths will not be resolved correctly.

# Move into the root directory of test-run
pushd ../../ >/dev/null 2>&1

echo "Root Dir: $PWD"

# Add the framework sources
PYTHONPATH="$PWD/framework/python/src"

# Add the test module sources
PYTHONPATH="$PYTHONPATH:$PWD/modules/test/tls/python/src"

# Set the python path with all sources
export PYTHONPATH

# Run the DHCP Unit tests
python3 -u $PWD/modules/network/dhcp-1/python/src/grpc_server/dhcp_config_test.py
python3 -u $PWD/modules/network/dhcp-2/python/src/grpc_server/dhcp_config_test.py

# Run the TLS Module Unit Tests
python3 -u $PWD/testing/unit/tls/tls_module_test.py


popd >/dev/null 2>&1