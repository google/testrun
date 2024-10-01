#!/bin/bash -e

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
  
  echo "Docker CMD: $DOCKER_CMD"

  # Execute the Docker command
  echo "Running test for ${MODULE_NAME}..."
  eval $DOCKER_CMD
}

# Check if the script received any arguments
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <module_name> [directories...]"
  exit 1
fi

# Call the run_test function with the provided arguments
run_test "$@"
