import subprocess
import logger


def run_command(cmd):
	success = False
	LOGGER = logger.get_logger('util')
	process = subprocess.Popen(cmd.split(), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
	stdout, stderr = process.communicate()
	if process.returncode !=0:
		err_msg = "%s. Code: %s" % (stderr.strip(), process.returncode)
		LOGGER.error("Command Failed: " + cmd)
		LOGGER.error("Error: " + err_msg)
	else:
		succ_msg = "%s. Code: %s" % (stdout.strip().decode('utf-8'), process.returncode)
		LOGGER.info("Command Success: " + cmd)
		LOGGER.info("Success: " + succ_msg)
		success = True
	return success