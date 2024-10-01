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
# Function to run tests inside Docker
run_test() {
  local MODULE_NAME=$1
  shift
  local DIRS=("$@")

  # Define the locations of the unit test files
  local UNIT_TEST_DIR_SRC="$PWD/testing/unit/$MODULE_NAME"
  local UNIT_TEST_FILE_SRC="$UNIT_TEST_DIR_SRC/${MODULE_NAME}_module_test.py"

  # Define the destination inside the container
  local UNIT_TEST_DIR_DST="/testing/unit/$MODULE_NAME"
  local UNIT_TEST_FILE_DST="/testrun/python/src/module_test.py"

  # Build the docker run command
  local DOCKER_CMD="sudo docker run --rm --name ${MODULE_NAME}-unit-test"

  # Add volume mount for the main test file
  DOCKER_CMD="$DOCKER_CMD -v $UNIT_TEST_FILE_SRC:$UNIT_TEST_FILE_DST"

  # Add volume mounts for additional directories if provided
  for DIR in "${DIRS[@]}"; do
    DOCKER_CMD="$DOCKER_CMD -v $UNIT_TEST_DIR_SRC/$DIR:$UNIT_TEST_DIR_DST/$DIR"
  done

  # Add the container image and entry point
  DOCKER_CMD="$DOCKER_CMD testrun/${MODULE_NAME}-test $UNIT_TEST_FILE_DST"
  
  # Temporarily disable 'set -e' to capture exit code
  set +e

  # Execute the Docker command
  echo "Running test for ${MODULE_NAME}..."
  eval $DOCKER_CMD

  # Capture the exit code
  local exit_code=$?

  # Return the captured exit code to the caller
  return $exit_code
}

# Check if the script received any arguments
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <module_name> [directories...]"
  exit 1
fi

# Call the run_test function with the provided arguments
run_test "$@"

# Capture the exit code from the run_test function
exit_code=$?

# If the exit code is not zero, print an error message
if [ $exit_code -ne 0 ]; then
    echo "Tests failed with exit code $exit_code"
else
    echo "All tests passed successfully."
fi

# Exit with the captured exit code
exit $exit_code