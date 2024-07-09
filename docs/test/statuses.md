<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

## Test Statuses
Testrun will output the result and description of each automated test. The test results will be one of the following:

| Name | Description | What next? |
|---|---|---|
| Compliant | The device implements the required feature correctly | Nothing |
| Non-Compliant | The device does not support the specified requirements for the test | Modify or implement the required functionality on the device |
| Feature Not Present | The device does not implement a feature covered by the test | You may implement the  functionality (not required) |
| Error | An error occured whilst running the test | Create a bug report requesting additional support to diagnose the issue |
| Skipped | The test has not been executed because a linked test did not produce a compliant result | You may implement the functionality (not required) |

## Test Requirement
Testrun also determines whether each test is required for the device to receive an overall compliant result. These rules are:

| Name | Description |
|---|---|
| Required | The device must implement the feature |
| Recommended | The device should implement the feature, but will not receive an overall Non-Compliant if not implemented |
| Roadmap | The device should implement this feature in the future, but is not required at the moment |
| Required If Applicable | If the device implements this feature, it must be implemented correctly (as per the test requirements) |

## Testrun Statuses
Once testing is completed, an overall result for the test attempt will be produced. This is calculated by comparing the result of all tests, and whether they are required or not required.

### Compliant
All required tests are implemented correctly, and all required if applicable tests are implemented correctly (where the feature has been implemented).

### Non-Compliant
One or more of the required tests (or required if applicable tests) have produced a non-compliant result.

### Error
One of more of the required tests (or required if applicable tests) have not executed correctly. This does not necessarily indicate that the device is compliant or non-compliant.