"""Baseline test module"""
from test_module import TestModule

LOG_NAME = "test_baseline"
LOGGER = None


class BaselineModule(TestModule):
  """An example testing module."""

  def __init__(self, module):
    super().__init__(module_name=module, log_name=LOG_NAME)
    global LOGGER
    LOGGER = self._get_logger()

  def _baseline_pass(self):
    LOGGER.info("Running baseline pass test")
    LOGGER.info("Baseline pass test finished")
    return True

  def _baseline_fail(self):
    LOGGER.info("Running baseline pass test")
    LOGGER.info("Baseline pass test finished")
    return False

  def _baseline_skip(self):
    LOGGER.info("Running baseline pass test")
    LOGGER.info("Baseline pass test finished")
