This tool creates CSV Files and Pie Charts for api.py against test_api.py and postman file data.

## Features

- Counts all the endpoints and responses from api.py 
- Counts all the enpoints and responses from the postman file
- Counts the number of API tests from 'test_api.py' for each unique response code across all endpoints tested 
- Creates a CSV file with data from api.py versus data from postman file
- Creates a CSV file with data from api.py versus data from test_api.py
- Creates a Pie Chart for postman coverage
- Creates a Pie Chart for test_api.py coverage

## Steps to generate the files

### 1. Run the following command in terminal to make 'setup' script executable

```bash 
chmod +x testing/api/tools/testing_coverage/setup
```

### 2. Run the setup script. You might be asked to restart the terminal or run 'source $BASH_CONFIG' in terminal.

```bash
testing/api/tools/testing_coverage/setup
```

### 3. Running the Script

``` bash
 testing/api/tools/testing_coverage/src/generate_results
```

### 8. The csv files and the pie charts will be created in the 'testing/api/testing_coverage/results' folder
