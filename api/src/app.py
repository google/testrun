"""Serve API routes for user interface component."""
from flask import Flask
from device import Device
import json
import os

DEVICES_DIR = "/devices"
DEVICE_CONFIG_FILE = "device_config.json"

devices = []
app = Flask("Test Run")

@app.route("/devices")
def get_devices():
  return {"devices": devices}

def load_devices():
  print("Loading devices from " + DEVICES_DIR)
  for device_name in os.listdir(DEVICES_DIR):
    device_file = os.path.join(DEVICES_DIR, device_name, DEVICE_CONFIG_FILE)
    with open(device_file, encoding="utf-8") as device_config:
      device_config_json = json.load(device_config)
      device = Device()
      device.mac_addr = device_config_json["mac_addr"]
      devices.append(device)
  print("Loaded " + str(len(devices)) + " devices")

if __name__ == "__main__":
  print("Starting API service")
  load_devices()
  app.run(debug=True, host="0.0.0.0")
