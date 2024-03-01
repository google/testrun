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
"""Module to run all the BACnet related methods for testing"""

import BAC0
import logging

LOGGER = None
BAC0_LOG = '/root/.BAC0/BAC0.log'

class BACnet():
  """BACnet Test module"""

  def __init__(self, log):
    # Set the log 
    global LOGGER
    LOGGER = log

    # Setup the BAC0 Log
    BAC0.log_level(log_file=logging.DEBUG,
                   stdout=logging.INFO,
                   stderr=logging.CRITICAL)

    self.devices = []

  def discover(self, local_ip=None):
    LOGGER.info('Performing BACnet discovery...')
    bacnet = BAC0.lite(local_ip)
    LOGGER.info('Local BACnet object: ' + str(bacnet))
    try:
      bacnet.discover(global_broadcast=True)
    except Exception as e:
      LOGGER.error(e)
    LOGGER.info('BACnet discovery complete')
    with open(BAC0_LOG,'r',encoding='utf-8') as f:
      bac0_log = f.read()
    LOGGER.info('BAC0 Log:\n' + bac0_log)
    self.devices = bacnet.devices

  # Check if the device being tested is in the discovered devices list
  def validate_device(self, local_ip, device_ip):
    result = None
    LOGGER.info('Validating BACnet device: ' + device_ip)
    self.discover(local_ip + '/24')
    LOGGER.info('BACnet Devices Found: ' + str(len(self.devices)))
    if len(self.devices) > 0:
      # Load a fail result initially and pass only
      # if we can validate it's the right device responding
      result = False, (
        'Could not confirm discovered BACnet device is the ' +
        'same as device being tested')
      for device in self.devices:
        address = device[2]
        LOGGER.info('Checking device: ' + str(device))
        if device_ip in address:
          result = True, 'Device IP matches discovered device'
          break
    else:
      result = None, 'BACnet discovery could not resolve any devices'
    if result is not None:
      LOGGER.info(result[1])
    return result
