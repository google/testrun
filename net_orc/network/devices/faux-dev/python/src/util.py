import subprocess
import shlex

# Runs a process at the os level
# By default, returns the standard output and error output
# If the caller sets optional output parameter to False,
# will only return a boolean result indicating if it was
# succesful in running the command.  Failure is indicated
# by any return code from the process other than zero.


def run_command(cmd, logger, output=True):
    success = False
    process = subprocess.Popen(shlex.split(
        cmd), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()

    if process.returncode != 0:
        err_msg = "%s. Code: %s" % (stderr.strip(), process.returncode)
        logger.error("Command Failed: " + cmd)
        logger.error("Error: " + err_msg)
    else:
        success = True

    if output:
        return success, stdout.strip().decode('utf-8'), stderr
    else:
        return success, None, stderr
