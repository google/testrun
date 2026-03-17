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

# Read the JSON file into a variable
DEVICE_TEST_PACK=$(<resources/test_packs/qualification/config.json)

# Function to run tests inside Docker
run_test() {
  local MODULE_NAME=$1
  shift
  local DIRS=("$@")

  # Используем абсолютный путь от текущей директории
  local ROOT_DIR=$(pwd)
  local UNIT_TEST_DIR_SRC="$ROOT_DIR/testing/unit/$MODULE_NAME"
  local UNIT_TEST_FILE_SRC="$UNIT_TEST_DIR_SRC/${MODULE_NAME}_module_test.py"

  # Явно задаем путь к папке отчета
  local COVERAGE_DIR_SRC="$UNIT_TEST_DIR_SRC/coverage_report"

  # Создаем папку ПЕРЕД запуском докера
  mkdir -p "$COVERAGE_DIR_SRC"

  local UNIT_TEST_FILE_DST="/testrun/python/src/module_test.py"

  # Собираем команду
  DOCKER_CMD=(
    sudo docker run --rm --name "${MODULE_NAME}-unit-test"
    -e "DEVICE_TEST_PACK=$DEVICE_TEST_PACK"
    -e "PYTHONPATH=/testrun/python/src:/testrun/python/src/common"
    -v "$UNIT_TEST_FILE_SRC:$UNIT_TEST_FILE_DST"
    -v "$COVERAGE_DIR_SRC:/coverage_report"
    --entrypoint "/bin/bash" # Явно указываем bash как точку входа
  )

  # Добавляем папки
  for DIR in "${DIRS[@]}"; do
    if [ -d "$UNIT_TEST_DIR_SRC/$DIR" ]; then
      DOCKER_CMD+=("-v" "$UNIT_TEST_DIR_SRC/$DIR:/testing/unit/$MODULE_NAME/$DIR")
    fi
  done

  # Передаем саму команду как аргументы для bash
  DOCKER_CMD+=(
    "testrun/${MODULE_NAME}-test"
    "-c" "pip install coverage && \
          python3 -m coverage run --source=/testrun/python/src $UNIT_TEST_FILE_DST && \
          python3 -m coverage report && \
          python3 -m coverage html -d /coverage_report"
  )

  echo "Running test for ${MODULE_NAME}..."
  "${DOCKER_CMD[@]}"

  # После выполнения теста (если он прошел), генерируем отчет
  if [ $? -eq 0 ]; then
    echo "Generating HTML report..."
    sudo docker run --rm \
      -v "$COVERAGE_DIR_SRC:/coverage_report" \
      --workdir /coverage_report \
      "testrun/${MODULE_NAME}-test" \
      python3 -m coverage html -d /coverage_report
  fi

  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
      echo "Coverage report generated in $COVERAGE_DIR_SRC/index.html"
  fi

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
