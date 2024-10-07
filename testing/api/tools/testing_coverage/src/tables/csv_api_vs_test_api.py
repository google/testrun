"""
Module to create CSV file for api.py versus test_api.py data
"""

import os
import pandas as pd
from counter import test_api_counter
from counter import api_counter

def calculate_percentages(postman_responses_count, api_responses_count):
  """ Calculates DONE and TO DO percentages """

  # Check if postman_responses_count is zero
  if postman_responses_count == 0:
    return "0.00 %", "100.00 %"

  # Calculate DONE percentage
  done_percentage = (postman_responses_count / api_responses_count) * 100

  # Calculate TO DO percentage
  todo_percentage = 100 - done_percentage

  # Return DONE and TO DO percentages as strings
  return f"{done_percentage:.2f} %", f"{todo_percentage:.2f} %"

def create_api_test_api_csv(test_api_file, api_file, csv_filename, results_dir):
  """ Create the api.py vs test_api.py CSV file """

  # Load the api.py enpoints details
  api_endpoints = api_counter.parse_api_file(api_file)

  # Error handling if the test_api.py couldn't be processed
  if api_endpoints is None:
    print(f"Error: Failed to create the CSV file '{csv_filename}'")
    return

  # Load the test_api.py enpoints details
  test_api_endpoints = test_api_counter.parse_test_api_file(test_api_file)

  # Error handling if the test_api.py couldn't be processed
  if test_api_endpoints is None:
    print(f"Error: Failed to create the CSV file '{csv_filename}'")
    return

  # Empty list to be assigned with rows to be written in the csv
  rows = []

  for (endpoint, method), _ in api_endpoints.items():

    # Load the response codes and total responses from api.py
    api_responses, api_responses_count = (
      api_counter.api_counter(
        api_endpoints,
        endpoint,
        method
      )
    )

    # Load the response codes tested and total responses from test_api.py
    responses_tested, postman_responses_count = (
      test_api_counter.test_api_counter(
        test_api_endpoints,
        endpoint,
        method
      )
    )

    # Calculate done and to do percentages
    done_percentage, todo_percentage = (
      calculate_percentages(postman_responses_count, api_responses_count)
    )

    # Calculate the response codes not tested
    not_tested_responses = sorted(set(api_responses) - set(responses_tested))

    # If all endpoint are tested the cell is left empy
    if len(not_tested_responses) == 0:
      not_tested_responses = ""

    # Not tested endpoints
    not_tested = api_responses_count - postman_responses_count

    # Construct the dictionary which represents a row in the table
    row = {
      "ENDPOINT PATH": endpoint,
      "METHOD": method.upper(),
      "API RESPONSES": api_responses,
      "TEST API FILE RESPONSES": responses_tested,
      "NOT TESTED RESPONSES": not_tested_responses,
      "TOTAL API RESPONSES": api_responses_count,
      "TOTAL POSTMAN RESPONSES": postman_responses_count,
      "NOT TESTED": not_tested,
      "DONE": done_percentage, 
      "TO DO": todo_percentage,
    }

    # Append the row to the list
    rows.append(row)

  # Convert rows to a table
  df = pd.DataFrame(rows)

  # Ensure the 'results' folder exists, if not, create it
  if not os.path.exists(results_dir):
    os.makedirs(results_dir)

  # Save the DataFrame to CSV inside the 'results' folder
  df.to_csv(os.path.join(results_dir, csv_filename), index=False)
  print(f"{csv_filename} exported to '{results_dir}/{csv_filename}'")
