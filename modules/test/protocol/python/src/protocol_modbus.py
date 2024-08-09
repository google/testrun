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
"""Module run all the Modbus related methods for testing"""

from pymodbus.client import ModbusTcpClient as ModbusClient
from pymodbus.exceptions import ModbusIOException

DEFAULT_MODBUS_PORT = 502
DEFAULT_DEVICE_ID = 1
DEFAULT_REG_START = 0
DEFAULT_REG_COUNT = 1
LOGGER = None


class Modbus():
  """Modbus Test module"""

  def __init__(self, log, device_ip, config):
    # Setup the log
    global LOGGER
    LOGGER = log

    # Setup modbus addressing
    self._port = config['port'] if 'port' in config else DEFAULT_MODBUS_PORT
    self._device_id = config[
        'device_id'] if 'device_id' in config else DEFAULT_DEVICE_ID

    # Setup default register states
    self._holding_reg_enabled = True
    self._input_reg_enabled = True
    self._coil_enabled = True
    self._discrete_input_enabled = True
    self._holding_reg_start = DEFAULT_REG_START
    self._holding_reg_count = DEFAULT_REG_COUNT
    self._input_reg_start = DEFAULT_REG_START
    self._input_reg_count = DEFAULT_REG_COUNT
    self._coil_reg_start = DEFAULT_REG_START
    self._coil_reg_count = DEFAULT_REG_COUNT
    self._discrete_input_reg_start = DEFAULT_REG_START
    self._discrete_input_reg_count = DEFAULT_REG_COUNT

    LOGGER.info('Config: ' + str(config))
    # Extract all register information
    if 'registers' in config:

      # Extract holding register information
      if 'holding' in config['registers']:
        if ('enabled' in config['registers']['holding']
            and config['registers']['holding']['enabled']) or (
                'enabled' not in config['registers']['holding']):
          self._holding_reg_start = config['registers']['holding'].get(
              'address_start', DEFAULT_REG_START)
          self._holding_reg_count = config['registers']['holding'].get(
              'count', DEFAULT_REG_COUNT)
        else:
          self._holding_reg_enabled = False

      # Extract input register information
      if 'input' in config['registers']:
        if ('enabled' in config['registers']['input']
            and config['registers']['input']['enabled']) or (
                'enabled' not in config['registers']['input']):
          self._input_reg_start = config['registers']['input'].get(
              'address_start', DEFAULT_REG_START)
          self._input_reg_count = config['registers']['input'].get(
              'count', DEFAULT_REG_COUNT)
        else:
          self._input_reg_enabled = False

      # Extract coil register information
      if 'coil' in config['registers']:
        if ('enabled' in config['registers']['coil']
            and config['registers']['coil']['enabled']) or (
                'enabled' not in config['registers']['coil']):
          self._coil_reg_start = config['registers']['coil'].get(
              'address_start', DEFAULT_REG_START)
          self._coil_reg_count = config['registers']['coil'].get(
              'count', DEFAULT_REG_COUNT)
        else:
          self._coil_enabled = False

      # Extract discrete register information
      if 'discrete' in config['registers']:
        if ('enabled' in config['registers']['discrete']
            and config['registers']['discrete']['enabled']) or (
                'enabled' not in config['registers']['discrete']):
          self._discrete_input_reg_start = config['registers']['discrete'].get(
              'address_start', DEFAULT_REG_START)
          self._discrete_input_reg_count = config['registers']['discrete'].get(
              'count', DEFAULT_REG_COUNT)
        else:
          self._discrete_input_enabled = False

    # Initialize the modbus client
    self.client = ModbusClient(host=device_ip, port=self._port)

  # Connections created from this method are simple socket connections
  # and aren't indicative of valid modbus
  def connect(self):
    connection = None
    try:
      LOGGER.info(f'Attempting modbus connection to: {str()}')
      connection = self.client.connect()
      if connection:
        LOGGER.info('Connected to Modbus device')
      else:
        LOGGER.info('Failed to connect to Modbus device')
    except ModbusIOException as e:
      LOGGER.error('Modbus Connection Failed:', e)
    return connection

  # Read a range of holding registers
  def read_holding_registers(self,
                             address=DEFAULT_REG_START,
                             count=DEFAULT_REG_COUNT,
                             device_id=DEFAULT_DEVICE_ID):
    registers = None
    LOGGER.info(f'Reading holding registers: {address}:{count}')
    try:
      response = self.client.read_holding_registers(address,
                                                    count,
                                                    slave=device_id)
      if response.isError():
        LOGGER.error(f'Failed to read holding registers: {address}:{count}')
        LOGGER.error('Read Response: ' + str(response))
      else:
        registers = response.registers
        LOGGER.info(f'Holding registers read: {str(registers)}')
    except ModbusIOException as e:
      LOGGER.error('Error reading holding registers:' + e)
    return registers

  # Read a range of input registers
  def read_input_registers(self,
                           address=DEFAULT_REG_START,
                           count=DEFAULT_REG_COUNT,
                           device_id=DEFAULT_DEVICE_ID):
    registers = None
    LOGGER.info(f'Reading input registers: {address}:{count}')
    try:
      response = self.client.read_input_registers(address,
                                                  count,
                                                  slave=device_id)
      if response.isError():
        LOGGER.error(f'Failed to read input registers: {address}:{count}')
        LOGGER.error('Read Response: ' + str(response))
      else:
        registers = response.registers
        LOGGER.info(f'Input registers read: {str(registers)}')
    except ModbusIOException as e:
      LOGGER.error('Error reading input registers:' + e)
    return registers

  # Read a range of input registers
  def read_coils(self,
                 address=DEFAULT_REG_START,
                 count=DEFAULT_REG_COUNT,
                 device_id=DEFAULT_DEVICE_ID):
    coils = None
    LOGGER.info(f'Reading coil registers: {address}:{count}')
    try:
      response = self.client.read_coils(address, count, slave=device_id)
      if response.isError():
        LOGGER.error(f'Failed to read coil registers: {address}:{count}')
        LOGGER.error('Read Response: ' + str(response))
      else:
        coils = response.bits
        LOGGER.info(f'Coil registers read: {str(coils)}')
    except ModbusIOException as e:
      LOGGER.error('Error reading coil registers:' + e)
    return coils

    # Read a range of input registers
  def read_discrete_inputs(self,
                           address=DEFAULT_REG_START,
                           count=DEFAULT_REG_COUNT,
                           device_id=DEFAULT_DEVICE_ID):
    inputs = None
    LOGGER.info(f'Reading discrete inputs: {address}:{count}')
    try:
      response = self.client.read_discrete_inputs(address,
                                                  count,
                                                  slave=device_id)
      if response.isError():
        LOGGER.error(f'Failed to read discrete inputs: {address}:{count}')
        LOGGER.error('Read Response: ' + str(response))
      else:
        inputs = response.bits
        LOGGER.info(f'Discrete inputs read: {str(inputs)}')
    except ModbusIOException as e:
      LOGGER.error('Error reading discrete inputs:' + e)
    return inputs

  # Check if we can make a modbus connection and read various registers
  # We don't care what the values in the registers are, just that
  # we can read them since we will not have an expectation
  # of the contents of the values
  def validate_device(self):
    result = None
    compliant = None
    details = ''
    LOGGER.info('Validating Modbus device')
    connection = self.connect()
    if connection:
      details = f'Established connection to modbus port: {self._port}'

      # Validate if the device supports holding registers and can be read
      holding_reg = self.read_holding_registers(self._holding_reg_start,
                                                self._holding_reg_count,
                                                self._device_id)
      if holding_reg:
        details += ('\nHolding registers succesfully read: ' +
                    f'{self._holding_reg_start}:{self._holding_reg_count}')
      else:
        details += ('\nHolding registers could not be read: ' +
                    f'{self._holding_reg_start}:{self._holding_reg_count}')

      # Validate if the device supports input registers and can be read
      input_reg = self.read_input_registers(self._input_reg_start,
                                            self._input_reg_count,
                                            self._device_id)
      if input_reg:
        details += ('\nInput registers succesfully read: ' +
                    f'{self._input_reg_start}:{self._input_reg_count}')
      else:
        details += ('\nInput registers could not be read: ' +
                    f'{self._input_reg_start}:{self._input_reg_count}')

      # Validate if the device supports coils and can be read
      coils = self.read_coils(self._coil_reg_start, self._coil_reg_count,
                              self._device_id)
      if coils:
        details += ('\nCoil registers succesfully read: ' +
                    f'{self._coil_reg_start}:{self._coil_reg_count}')
      else:
        details += ('\nCoil registers could not be read: ' +
                    f'{self._coil_reg_start}:{self._coil_reg_count}')

      # Validate if the device supports discrete inputs and can be read
      discrete_inputs = self.read_discrete_inputs(
          self._discrete_input_reg_start, self._discrete_input_reg_count,
          self._device_id)
      if discrete_inputs:
        details += (
            '\nDiscrete inputs succesfully read: ' +
            f'{self._discrete_input_reg_start}:{self._discrete_input_reg_count}'
        )
      else:
        details += (
            '\nDiscrete inputs could not be read: ' +
            f'{self._discrete_input_reg_start}:{self._discrete_input_reg_count}'
        )

      # Since we can't know what data types the device supports
      # we'll pass if any of the supported data types are succesfully read
      compliant = (holding_reg is not None or input_reg is not None
                   or coils is not None or discrete_inputs is not None)
    else:
      compliant = None
      details = 'Failed to establish Modbus connection to device'
    result = compliant, details
    return result
