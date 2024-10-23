""" 
Module to parse api.py to extract each endpoint, methods and 
unique response codes for each (endpoint, method)

"""

import re
from util import load_python_file

def parse_api_file(api_path):
  """Extract endpoints, methods, fucntions and status codes from api.py lines"""

  # Pattern to match the 'add_api_route' function api calls
  api_route_pattern = re.compile(
    r'self\._router\.add_api_route\("([^"]+)",\s*self\.(\w+)' +
    r"(?:,\s*methods=\[(.*?)\])?\)")

  # Pattern to match the endpoints functions
  function_pattern = re.compile(r"def\s+(\w+)\(")

  # Pattern to match the status codes for endpoints
  status_code_pattern = re.compile(r"response\.status_code\s*=\s*(\w+(\.\w+)*)")

  # Load the 'api.py' lines
  api_lines = load_python_file.load_python_file(api_path)

  # Error handling if api.py file is not available
  if not api_lines:
    return

  # Dictionary to store (endpoint, method) as key and the function as value
  extracted_api_details = {}

  # List to store all endpoints functions
  api_functions = []

  # Variable to hold multiple lines
  complete_api_line = ""

  # Iterate over all api.py lines to find endpoints, methods and functions
  for api_line in api_lines:

    # if origins = ["*"] is found break since all endpoints have been found
    if 'origins = ["*"]' in api_line:
      break

    # Remove leading and trailing spaces
    api_line = api_line.strip()

    # If line is empty skip and move to the next line
    if api_line:

      # Append the line to complete_api_line, adding a space if it's not empty
      complete_api_line += " " + api_line if complete_api_line else api_line

      # Check if the line ends with ')'
      if complete_api_line.endswith(")"):

        # Check if api pattern is found on the line
        api_route_match = api_route_pattern.search(complete_api_line)

        # If found a matching line
        if api_route_match:

          # Extract endpoint, function name, and method
          endpoint, function, method = api_route_match.groups()

          # Clean the method or assign the method 'get' if not specified
          method = (method or "GET").strip().strip('"').lower()

          # Store endpoint and method in a tuple
          endpoint_method = (endpoint, method)

          # Check if the endpoint and method exist in dict
          if endpoint_method not in extracted_api_details:

            # Add the function name as value for (endpoint, method)
            extracted_api_details[endpoint_method] = function

            # Add the function to the api_functions list
            api_functions.append(function)

        # Reset complete_api_line
        complete_api_line = ""

  # Dictionary to store function as key and the status codes as value
  function_status_codes = {}

  # Set current function variable
  current_function = None

  # Iterate over all api.py lines to find functions and their status codes
  for api_line in api_lines:

    # Remove leading and trailing spaces
    api_line = api_line.strip()

    # Check if function_pattern is found in the line
    function_pattern_match = function_pattern.search(api_line)

    # If a match is found
    if function_pattern_match:

      # Extract the function name
      function_name = function_pattern_match.group(1)

      # Check if funcion name is in api_functions to ignore utility functions
      if function_name in api_functions:

        # Assign the function name to 'curent_function' variable
        current_function = function_name

        # Add the function as key and value empty set
        function_status_codes[current_function] = set()

    # If function was found
    if current_function:

      # Check if status code pattern is found
      status_code_match = status_code_pattern.search(api_line)

      # If a match is found
      if status_code_match:

        # Extract the response.status_code value
        status_code_value = status_code_match.group(1)

        # Extract the digits from the status code value
        status_code = re.search(r"\d+", status_code_value)

        # Exclude 500 errors from the status codes
        if status_code.group(0) != "500":

          # Add status code to the dict value inside the set
          function_status_codes[current_function].add(status_code.group(0))

  # Find the 'get' endpoints functions with no 200 status code for success
  for (endpoint, method), function in extracted_api_details.items():

    # if '200' and '201' not in the function's status codes
    if not {"200", "201"} & function_status_codes.get(function, set()):

      #  Add status code 200
      function_status_codes[function].add("200")

  # New dict to store '(endpoint, method): status codes'
  endpoint_method_responses = {}

  # Iterate over extracted_api_details keys and values
  for endpoint_method, function in extracted_api_details.items():

    # Get the status codes for the function
    responses = function_status_codes.get(function)

    # Add status codes as value for (endpoint, method)
    endpoint_method_responses[endpoint_method] = responses

  # Return dictionary
  return endpoint_method_responses

def api_counter(endpoint_method_responses, endpoint, method):
  """ Returns all unique responses and total responses for each endpoint """  

  # Response codes for each endpoint in api.py
  responses = endpoint_method_responses.get((endpoint, method), set())

  # Total responses for the endpoint
  responses_count = len(responses)

  # Combine each endpoint responses into a string (one per line)
  # format_responses = "\n".join(map(str, sorted(responses)))

  # Change the responses from strigs to integers
  format_responses = [int(code) for code in sorted(responses)]

  # Return each response and total responses
  return format_responses, responses_count
