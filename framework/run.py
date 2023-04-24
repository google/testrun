"""Starts Test Run."""

import logger
from testrun import TestRun

LOGGER = logger.get_logger('runner')

class TestRunner:

    def __init__(self):

        LOGGER.info('Starting Test Run')
        
        testrun = TestRun()

        testrun.load_config()

        testrun.start_network()

        testrun.run_tests()

        testrun.stop_network()

runner = TestRunner()
