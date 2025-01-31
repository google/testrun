"""Provide custom logic for test packs"""

from common.statuses import TestrunStatus, TestrunResult, TestResult

def calculate_result(json):
  """Provide the testing result based on the output of testing"""
  result = TestrunResult.COMPLIANT

  for test_result in json:

    # Check Required tests
    if (test_result.required_result.lower() == "required"
        and test_result.result not in [
          TestResult.COMPLIANT,
          TestResult.ERROR
        ]):
      result = TestrunResult.NON_COMPLIANT

    # Check Required if Applicable tests
    elif (test_result.required_result.lower() == "required if applicable"
          and test_result.result == TestResult.NON_COMPLIANT):
      result = TestrunResult.NON_COMPLIANT

  return result

def calculate_status(result, json): # pylint: disable=unused-argument
  """Provide the status based on the output of testing"""

  status = TestrunStatus.COMPLETE

  if result in [
    TestrunResult.COMPLIANT,
    TestrunResult.NON_COMPLIANT
  ]:
    status = TestrunStatus.COMPLETE

  return status
