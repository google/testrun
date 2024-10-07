"""
Module to create CSV file for api.py vs postman data
"""

import os
import pandas as pd
from counter import api_counter
from counter import postman_counter

def calculate_percentages(tested_count, unique_responses_count):
  """ Calculates DONE and TO DO percentages """

  # Check if tested_count is zero
  if tested_count == 0:
    return "0.00 %", "100.00 %"

  # Calculate DONE percentage
  done_percentage = (tested_count / unique_responses_count) * 100

  # Calculate TO DO percentage
  todo_percentage = 100 - done_percentage

  # return DONE and TO DO percentages as strings
  return f"{done_percentage:.2f} %", f"{todo_percentage:.2f} %"

def create_api_postman_csv(postman_file, api_file, csv_filename, results_dir):
  """ Create the api vs postman CSV file """

  # Load the api.py enpoints details
  api_endpoints = api_counter.parse_api_file(api_file)

  # Error handling if the test_api.py couldn't be processed
  if api_endpoints is None:
    print(f"Error: Failed to create the CSV file '{csv_filename}'")
    return

  # Load the postman enpoints details
  postman_endpoints = postman_counter.parse_postman_file(postman_file)

  # Error handling if psotman file couldn't be processed
  if postman_endpoints is None:
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

    # Load the response codes tested and total responses from postman file
    postman_responses, postman_responses_count = (
      postman_counter.postman_counter(
        postman_endpoints,
        endpoint,
        method
      )
    )

    # Calculate done and to do percentages
    done_percentage, todo_percentage = (
      calculate_percentages(postman_responses_count, api_responses_count)
    )

    # Calculate the response codes not tested
    not_tested_responses = sorted(set(api_responses) - set(postman_responses))

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
      "POSTMAN RESPONSES": postman_responses,
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
