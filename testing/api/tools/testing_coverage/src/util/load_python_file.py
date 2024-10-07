"""
Module to load python files
"""

def load_python_file(python_file):
  """ Loads and return the lines from the python file """

  try:

    # Attempt to open and load the python file
    with open(python_file, "r", encoding="utf-8") as file:

      # Return a list with all lines from the file
      return file.readlines()

  # Error handling if python file is not found
  except FileNotFoundError:
    print(f"Error: {python_file} was not found")
    return None
  