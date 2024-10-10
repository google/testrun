<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

# Test results 

Testrun outputs the result and a description of each automated test. The table below includes the result name, its description, and what your next step should be. 

| Result name           | Description              | What next?               |
| --------------------- | ------------------------ | ------------------------ |
| Compliant             | The device implements the required feature correctly. | Nothing. |
| Non-Compliant         | The device doesn’t support the specified requirements for the test. | Modify or implement the required functionality on the device. |
| Informational         | Extra information about the device under test | Nothing. |
| Feature Not Detected  | The device doesn’t implement a feature covered by the test. | You may implement the functionality but it’s not required. |
| Error                 | An error occurred while running the test. | Create a bug report requesting additional support to diagnose the issue. |


# Test requirements

Testrun determines whether the device needs each test to receive an overall compliant result. Here are the rules and what they mean:

-  Required: The device must implement the feature.
-  Recommended: The device should implement the feature but won't receive an overall Non-Compliant if it's not implemented.
-  Roadmap: The device should implement this feature in the future, but it's not required at the moment.
-  Required If Applicable: If the device implements this feature, it must be implemented correctly (per the test requirements).

# Testrun statuses

Once testing is complete, the program produces an overall status for the test attempt. It's calculated by comparing the results of all tests and whether they're required or not. The possible statuses are:

-  Compliant: All required tests are implemented correctly, and all required if applicable tests are implemented correctly (where the feature is implemented).
-  Non-Compliant: One or more of the required tests (or Required If Applicable tests) produced a Non-Compliant result.
-  Error: One or more of the required tests (or Required If Applicable tests) didn't execute correctly. This doesn't necessarily indicate that the device is Compliant or Non-Compliant.
-  Cancelled: Either the device was disconnected during testing or the user requested to cancel the test attempt.