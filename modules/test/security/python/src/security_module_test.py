from tls_util import TLSUtil
import unittest
import common.logger as logger

MODULE_NAME='security_module_test'
TLS_UTIL = None

class SecurityModuleTest(unittest.TestCase):

	@classmethod
	def setUpClass(cls):
		log = logger.get_logger(MODULE_NAME)
		global TLS_UTIL
		TLS_UTIL = TLSUtil(log)

	def security_tls_v1_2_server_test(self):
		test_results = TLS_UTIL.validate_tls_server('google.com',tls_version='1.2')
		self.assertTrue(test_results[0])

	def security_tls_v1_3_server_test(self):
  		test_results = TLS_UTIL.validate_tls_server('google.com',tls_version='1.3')
  		self.assertTrue(test_results[0])

if __name__ == '__main__':
  suite = unittest.TestSuite()
  suite.addTest(SecurityModuleTest('security_tls_v1_2_server_test'))
  suite.addTest(SecurityModuleTest('security_tls_v1_3_server_test'))
  runner = unittest.TextTestRunner()
  runner.run(suite)