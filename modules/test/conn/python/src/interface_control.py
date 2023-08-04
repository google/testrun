# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Interface Control Module"""
from common import logger
from common import util
import os

LOGGER = logger.get_logger('interface_ctrl')


class InterfaceControl:
  """Interface Control"""

  def power_off_interface(self,interface_type='dev'):
    LOGGER.info('Powering off interface: ' + interface_type)
    return self._set_interface_power_option('off',interface_type)

  def power_on_interface(self,interface_type='dev'):
    LOGGER.info('Powering on interface: ' + interface_type)
    return self._set_interface_power_option('on',interface_type)

  # Power off an ip interface by type
  def _set_interface_power_option(self,option, interface_type='dev'):
    success = False
    if interface_type == 'dev':
      device_id = self.get_dev_interface_id('DEV_IFACE_ID')
    else:
      device_id = self.get_dev_interface_id('INT_IFACE_ID')
    if device_id is not None:
      LOGGER.info('Device ID resolved: ' + device_id)
      pwr_cntrl_file = '/sys/bus/usb/devices/' + device_id + '/power/control'
      if os.path.exists(pwr_cntrl_file):
        LOGGER.info('Power control for USB device detected')
        success = util.run_command('echo "' + option + '" > '
          + pwr_cntrl_file, False)
        if success:
          with open(pwr_cntrl_file, 'r', encoding='UTF-8') as f:
            power_status = f.read()
            if power_status == option:
              LOGGER.info('USB device powered off')
              success = True
            else:
              LOGGER.info('USB device failed to power off')
      else:
        LOGGER.info('USB device does not support power control')
    else:
      LOGGER.info('No device ID resolved')
    return success

  # Resolve the device id mounted as a known env var from
  # test orchestrator if it exists as a usb interface
  def get_dev_interface_id(self, interface_key):
    iface_id = os.environ.get(interface_key)
    if iface_id is not None:
      return iface_id
    return None
