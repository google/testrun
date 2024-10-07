"""
Module to load json file
"""

import json

def load_json_file(json_file):
  """Loads json file"""

  try:

    # Attempt to open and load the json file
    with open(json_file, "r", encoding="utf-8") as file:

      # Return the json file
      return json.load(file)

  # Error handling if json file is not found
  except FileNotFoundError:
    print(f"Error: '{json_file}' was not found.")
    return None

  # Error handling if file is not valid json
  except json.JSONDecodeError:
    print(f"Error: '{json_file}' is not a valid JSON file.")
    return None
