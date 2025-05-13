#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
BACnet/IP Virtual Device that Starts Without an IP (Waits for DHCP Assignment)
"""

import time
import BAC0
import threading

from pymodbus.server import StartTcpServer
from pymodbus.datastore import ModbusSequentialDataBlock
from pymodbus.datastore import ModbusSlaveContext, ModbusServerContext

LISTEN_ADDRESS = '0.0.0.0'
MODBUS_PORT = 502

def run_modbus_device():
  """Starts the Modbus TCP server"""

  print('Starting Modbus Virtual Device...')

  # Initialize the modbus server data store
  store = ModbusSlaveContext(
      hr=ModbusSequentialDataBlock(0, [10] * 100),
      di=ModbusSequentialDataBlock(0, [False]*100),
      co=ModbusSequentialDataBlock(0, [False]*100),
      ir=ModbusSequentialDataBlock(0, [20]*100),
      zero_mode=True
  )
  context = ModbusServerContext(slaves=store, single=True)

  StartTcpServer(context=context,
                 address=(LISTEN_ADDRESS, MODBUS_PORT))

def run_bacnet_device():
  """Starts the BACnet/IP virtual device with no pre-assigned IP."""

  print('Starting BACnet Virtual Device...')

  bacnet = BAC0.lite(deviceId=999)

  bacnet.iam()

  while True:
    time.sleep(10)

if __name__ == '__main__':

  modbus_thread = threading.Thread(target=run_modbus_device, daemon=True)
  modbus_thread.start()

  # Run the BACnet device in the main thread
  run_bacnet_device()
