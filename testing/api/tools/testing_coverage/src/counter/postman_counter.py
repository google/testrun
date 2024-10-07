"""
Module to parse postman json file to extract each endpoint,
method and response codes for each (endpoint, method)
"""

from util import load_json_file

def extract_endpoint_path(path_elements):
  """ Joins the components of the 'path' key to create the endpoint """

  endpoint = "/" + "/".join(path_elements)
  return endpoint

def parse_postman_file(postman_path):
  """ Extract endpoints, methods and status codes from postman """

  # Load the Postman file
  postman_data = load_json_file.load_json_file(postman_path)

  # Error handling if postman file is not available
  if not postman_data:
    return

  # Dict to store each (endpoint, method): status codes
  endpoint_method_responses = {}

  # Iterate over all Postman file endpoints data
  for item in postman_data["item"]:

    # Assign the 'request' field
    request = item["request"]

    # Assign the 'path' field
    path = request["url"]["path"]

    # Extract the endpoint method and change to lowercase
    method = request["method"].lower()

    # Assign the 'response' field
    responses = item["response"]

    # Extract the endpoint path from 'path' field using 'extract_endpoint_path'
    endpoint = extract_endpoint_path(path)

    # Create a set of unique response codes and exclude any 500 errors
    unique_responses = {
      response["code"] for response in responses if response["code"] != 500
      }

    # Add in dict (endpoint, method) as key and respones as value
    endpoint_method_responses[(endpoint, method)] = unique_responses

  return endpoint_method_responses

def postman_counter(endpoint_method_responses, endpoint, method):
  """ Returns all unique responses and total responses for each endpoint """  

  # Response codes for each endpoint in postman
  responses = endpoint_method_responses.get((endpoint, method), set())

  # Total responses for the endpoint
  responses_count = len(responses)

  # Change the responses from strigs to integers
  format_responses = [int(code) for code in sorted(responses)]

  # Return each response and total responses
  return format_responses, responses_count
