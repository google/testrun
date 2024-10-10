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
run_test(){

	local REPORT_TEST_FILE=$1

	# Activate Python virtual environment
	source venv/bin/activate

	# Add the framework sources
	PYTHONPATH="$PWD/framework/python/src:$PWD/framework/python/src/common"

	# Set the python path with all sources
	export PYTHONPATH

	# Temporarily disable 'set -e' to capture exit code
    set +e

	# Run all host level unit tests from within the venv
	python3 $REPORT_TEST_FILE

	# Capture the exit code
    local exit_code=$?

	deactivate

	# Return the captured exit code to the caller
    return $exit_code
}


# Check if the script received any arguments
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <report_test_file>"
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