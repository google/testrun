"""Provides high level management of the test orchestrator."""
import time
import logger

LOGGER = logger.get_logger('runner')


class Runner:
  """Holds the state of the testing for one device."""

  def __init__(self, test_orc, device):
    self._test_orc = test_orc
    self._device = device

  def run(self):
    self._run_test_modules()

  def _run_test_modules(self):
    """Iterates through each test module and starts the container."""
    LOGGER.info('Running test modules...')
    for module in self._test_modules:
      self.run_test_module(module)
    LOGGER.info('All tests complete')

  def run_test_module(self, module):
    """Start the test container and extract the results."""

    if module is None or not module.enable_container:
      return

    self._test_orc.start_test_module(module)

    # Determine the module timeout time
    test_module_timeout = time.time() + module.timeout
    status = self._test_orc.get_module_status(module)

    while time.time() < test_module_timeout and status == 'running':
      time.sleep(1)
      status = self._test_orc.get_module_status(module)

    LOGGER.info(f'Test module {module.display_name} has finished')
