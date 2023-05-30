"""Run OVS module"""
import logger
import signal
import sys
import time

from ovs_control import OVSControl

LOGGER = logger.get_logger('ovs_control_run')

class OVSControlRun:
  """Run the OVS module."""
  def __init__(self):

    signal.signal(signal.SIGINT, self.handler)
    signal.signal(signal.SIGTERM, self.handler)
    signal.signal(signal.SIGABRT, self.handler)
    signal.signal(signal.SIGQUIT, self.handler)

    LOGGER.info('Starting OVS Control')

    # Get all components ready
    self._ovs_control = OVSControl()

    self._ovs_control.restore_net()

    self._ovs_control.create_net()

    self._ovs_control.show_config()

    # Get network ready (via Network orchestrator)
    LOGGER.info('Network is ready. Waiting for device information...')

    #Loop forever until process is stopped
    while True:
      LOGGER.info('OVS Running')
      time.sleep(1000)

    # TODO: This time should be configurable (How long to hold before exiting,
    # this could be infinite too)
    #time.sleep(300)

    # Tear down network
    #self._ovs_control.shutdown()

  def handler(self, signum):
    LOGGER.info('SigtermEnum: ' + str(signal.SIGTERM))
    LOGGER.info('Exit signal received: ' + str(signum))
    if (signum == 2 or signal == signal.SIGTERM):
      LOGGER.info('Exit signal received. Restoring network...')
      self._ovs_control.shutdown()
      sys.exit(1)

ovs = OVSControlRun()
