import logger
import util

from dhcp_check import DHCPLease

LOGGER = None
LOG_NAME = "gateway_validator"


class GatewayValidator:

    def __init__(self, module):
        self._gateway = None
        self._default_gateway_test = False
        self.add_logger(module)

    def add_logger(self, module):
        global LOGGER
        LOGGER = logger.get_logger(LOG_NAME, module)

    def print_test_results(self):
        self.print_test_result("Default gateway test",
                               self._default_gateway_test)

    def print_test_result(self, test_name, result):
        LOGGER.info(test_name + ": Pass" if result else test_name + ": Fail")


    def validate(self, dhcp_lease):
        self._gateway = dhcp_lease.gateway
        self.check_default_gateway()

    def check_default_gateway(self):
        LOGGER.info(
            "Checking default gateway matches DHCP gateway: " + self._gateway)
        cmd = "/testrun/bin/get_default_gateway"
        success, default_gateway, stderr = util.run_command(cmd, LOGGER)
        LOGGER.info("Default gateway resolved: " + default_gateway)
        if default_gateway == self._gateway:
            self._default_gateway_test = True