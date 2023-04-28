import time
import logger
import util

LOGGER = None
LOG_NAME = "ntp_validator"
ATTEMPTS = 3


class NTPValidator:
    """Perform testing of the NTP server."""

    def __init__(self, module):
        self._ntp_server = None
        self._ntp_sync_test = False
        self.add_logger(module)

    def add_logger(self, module):
        global LOGGER
        LOGGER = logger.get_logger(LOG_NAME, module)

    def print_test_results(self):
        """Print all test results to log."""
        self.print_test_result("NTP sync test",
                               self._ntp_sync_test)

    def print_test_result(self, test_name, result):
        """Output test result to log."""
        LOGGER.info(test_name + ": Pass" if result else test_name + ": Fail")

    def validate(self, dhcp_lease):
        """Call NTP sync test."""
        self._ntp_server = dhcp_lease.ntp_server
        self.check_ntp()

    def check_ntp(self):
        """Perform NTP sync test."""
        if self._ntp_server is not None:
            attempt = 0
            LOGGER.info(f"Attempting to sync to NTP server: {self._ntp_server}")
            LOGGER.info("Attempts allowed: " + str(ATTEMPTS))

            # If we don't ping before syncing, this will fail.
            while attempt < ATTEMPTS and not self._ntp_sync_test:
                attempt += 1
                if self.ping_ntp_server():
                    self.sync_ntp()
                if not self._ntp_sync_test:
                    LOGGER.info("Waiting 5 seconds before next attempt")
                    time.sleep(5)
        else:
            LOGGER.info("No NTP server available from DHCP lease")

    def sync_ntp(self):
        """Send NTP request to server."""
        LOGGER.info("Sending NTP Sync Request to: " + self._ntp_server)
        cmd = "ntpdate " + self._ntp_server
        ntp_response = util.run_command(cmd, LOGGER)[1]
        LOGGER.info("NTP sync response: " + ntp_response)
        if "adjust time server " + self._ntp_server in ntp_response:
            LOGGER.info("NTP sync succesful")
            self._ntp_sync_test = True
        else:
            LOGGER.info("NTP client failed to sync to server")

    def ping_ntp_server(self):
        """Ping NTP server before sending a time request."""
        LOGGER.info("Pinging NTP server before syncing...")
        if self.ping(self._ntp_server):
            LOGGER.info("NTP server successfully pinged")
            return True
        LOGGER.info("NTP server did not respond to ping")
        return False

    def ping(self, host):
        """Send ping request to host."""
        cmd = "ping -c 1 " + host
        success = util.run_command(cmd, LOGGER)
        return success
