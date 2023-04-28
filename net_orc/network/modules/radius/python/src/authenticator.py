from chewie.chewie import Chewie
import logging

_LOG_FORMAT = "%(asctime)s %(name)-8s %(levelname)-7s %(message)s"
_DATE_FORMAT = '%b %02d %H:%M:%S'
INTERFACE_NAME="veth0"
RADIUS_SERVER_IP="127.0.0.1"
RADIUS_SERVER_PORT=1812
RADIUS_SERVER_SECRET="testing123"

class Authenticator():

    def __init__(self):
        self.chewie = Chewie(INTERFACE_NAME, self._get_logger(), self._auth_handler, self._failure_handler, self._logoff_handler, radius_server_ip=RADIUS_SERVER_IP, radius_server_port=RADIUS_SERVER_PORT, radius_server_secret=RADIUS_SERVER_SECRET)
        self.chewie.run()

    def _get_logger(self):
        logging.basicConfig(format=_LOG_FORMAT, datefmt=_DATE_FORMAT, level=logging.INFO)
        logger = logging.getLogger("chewie")
        return logger

    def _auth_handler(self, address, group_address, *args, **kwargs):
        print("Successful auth for " + str(address) + " on port " + str(group_address))

    def _failure_handler(self, address, group_address):
        print("Failed auth for " + str(address) + " on port " + str(group_address))

    def _logoff_handler(self, address, group_address):
        print("Log off reported for " + str(address) + " on port " + str(group_address))

authenticator = Authenticator()