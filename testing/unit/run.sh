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

# Must be run from the root directory of Testrun
run_test() {
  local MODULE_NAME=$1
  shift
  local DIRS=("$@")

  # Define the locations of the unit test files
  local UNIT_TEST_DIR_SRC="$PWD/testing/unit/$MODULE_NAME"
  local UNIT_TEST_FILE_SRC="$UNIT_TEST_DIR_SRC/${MODULE_NAME}_module_test.py"

  # Define the location in the container to
  # load the unit test files
  local UNIT_TEST_DIR_DST="/testing/unit/$MODULE_NAME"
  local UNIT_TEST_FILE_DST="/testrun/python/src/module_test.py"

  # Build the docker run command
  local DOCKER_CMD="sudo docker run --rm -it --name ${MODULE_NAME}-unit-test"


  # Add volume mounts for the main test file
  DOCKER_CMD="$DOCKER_CMD -v $UNIT_TEST_FILE_SRC:$UNIT_TEST_FILE_DST"

  # Add volume mounts for additional directories
  for DIR in "${DIRS[@]}"; do
    DOCKER_CMD="$DOCKER_CMD -v $UNIT_TEST_DIR_SRC/$DIR:$UNIT_TEST_DIR_DST/$DIR"
  done

  # Add the container image and entry point
  DOCKER_CMD="$DOCKER_CMD testrun/${MODULE_NAME}-test $UNIT_TEST_FILE_DST"
  
  # Execute the docker command
  eval $DOCKER_CMD
}

# Run all test module tests from within their containers
run_test "conn" "captures" "ethtool" "output"
run_test "dns" "captures" "reports" "output"
run_test "ntp" "captures" "reports" "output"
run_test "protocol" "captures" "output"
run_test "services" "reports" "results" "output"
run_test "tls" "captures" "CertAuth" "certs" "reports" "root_certs" "output"

# Activate Python virtual environment
source venv/bin/activate

# Add the framework sources
PYTHONPATH="$PWD/framework/python/src:$PWD/framework/python/src/common"

# Set the python path with all sources
export PYTHONPATH

# Run all host level unit tests from within the venv
python3 testing/unit/risk_profile/risk_profile_test.py
python3 testing/unit/report/report_test.py

deactivate