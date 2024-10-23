"""
Module to parse 'test_api.py' to count unique API responses for each endpoint
Skipped tests are excluded from the count

"""

import re
from util import load_python_file

def parse_test_api_file(test_api_path):
  """ Parse test_api.py and store endpoint, method and all response codes """

  # Dict to store each (endpoint, method): status codes
  endpoint_method_responses = {}

  # Pattern to match API requests even when split across 2 lines
  api_call_pattern = re.compile(r'requests\.(get|post|put|delete)\(f?"([^"]+)"')

  # Pattern to match status code assertions
  status_code_pattern = re.compile(r"assert r\.status_code == (\d{3})")

  # Pattern to match the skipped tests
  skip_pattern = re.compile(r"@pytest\.mark\.skip|pytest\.skip\(")

  # Pattern to detect the start of a new test
  test_pattern = re.compile(r"def test_\w+\(")

  # Variable to keep track of the current endpoint being processed
  endpoint_method = None

  # Track if the current test is skipped
  skip_test = False

  # Track when the first request is found in the test
  found_first_request = False

  # Track when the status code is checked
  checked_status_code = False

  # Load the test_apy.py lines
  test_api_lines = load_python_file.load_python_file(test_api_path)

  # Error handling if test_api.py file is not available
  if not test_api_lines:
    return

  # Enumerate over all test_api.py lines
  for i, test_api_line in enumerate(test_api_lines):

    # Strip leading and trailing whitespaces
    test_api_line = test_api_line.strip()

    # Check if the line ends with an open parenthesis
    if test_api_line.endswith("(") and i + 1 < len(test_api_lines):

      # Concatenate with the next line
      test_api_line += test_api_lines[i + 1].strip()

    # Check if the line is the start of a new test
    if test_pattern.match(test_api_line):

    # Reset the flags to false for a new test
      skip_test = False
      found_first_request = False
      checked_status_code = False

    # Check if the test is marked as skipped
    if skip_pattern.match(test_api_line):

      # Change the skip_test to true
      skip_test = True

      # Skip the line
      continue

    # If the test is skipped
    if skip_test:

      # Skip all the lines for the test
      continue

    # Try to find an API request in the current line
    if not found_first_request:

      # Try to find an API request in the current line
      api_match = api_call_pattern.search(test_api_line)

      # if a match is found
      if api_match:

        # Capture the method and the endpoint from the matched API request
        method, endpoint = api_match.groups()

        # Remove the {API} placeholder, trailing '/' and change to lowercase
        endpoint = endpoint.replace("{API}", "").lower().rstrip("/")

        # Store method and endpoint in tuple
        endpoint_method = (endpoint, method)

        # Set found_first_request to true for next requests not be counted
        found_first_request = True

    # If the request was found and status code assert line not
    if found_first_request and not checked_status_code:

      # Try to find a status code assertion in the current line
      status_code_match = status_code_pattern.match(test_api_line)

      # If the a statsu code assert match was found
      if status_code_match and endpoint_method:

        # Capture the status code from the assertion
        status_code = status_code_match.group(1)

        # Check if the current endpoint is already in the dictionary
        if endpoint_method not in endpoint_method_responses:

          # If not, initialize an empty set for this endpoint and method
          endpoint_method_responses[endpoint_method] = set()

        # Exclude the 500 error
        if status_code != "500":

          # Add the status code to the set for this endpoint and method
          endpoint_method_responses[endpoint_method].add(status_code)

        # Set the checked_status_code to true to skip next lines
        checked_status_code = True

    # If the status code has been processed
    if checked_status_code:

      # Skip the rest of the test lines
      continue

  # Return dictionary
  return endpoint_method_responses

def test_api_counter(endpoint_method_responses, endpoint, method):
  """ Returns all unique responses and total responses for each endpoint """  

  # Response codes tested for each endpoint in test_api.py
  res_tested = endpoint_method_responses.get((endpoint, method), set())

  # Total responses tested for the endpoint
  tested_count = len(res_tested)

  # Combine each tested endpoint responses into a string (one per line)
  # format_res_tested = "\n".join(map(str, sorted(res_tested)))

  # Change the responses from strigs to integers
  format_res_tested = [int(code) for code in sorted(res_tested)]

  # Return each response tested and total responses
  return format_res_tested, tested_count
