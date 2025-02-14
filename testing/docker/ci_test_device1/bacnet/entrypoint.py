#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
BACnet/IP Virtual Device that Starts Without an IP (Waits for DHCP Assignment)
"""

import time
import BAC0


def start_bacnet_device():
  """Starts the BACnet/IP virtual device with no pre-assigned IP."""

  print("Starting BACnet Virtual Device...")

  bacnet = BAC0.lite(deviceId=999)

  bacnet.iam()

  while True:
    time.sleep(10)


if __name__ == "__main__":
  start_bacnet_device()
