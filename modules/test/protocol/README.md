# Protocol Test Module

The protocol test module verifies whether the device communicates using BMS protocols.

## What's inside?

The ```bin``` folder contains the startup script for the module.

The ```config/module_config.json``` provides the name and description of the module, and specifies which tests will be caried out.

Within the ```python/src``` directory, the below tests are executed.

## Tests covered

| ID | Description | Expected behavior | Required result
|---|---|---|---|
| protocol.valid_bacnet | Can valid BACnet traffic be seen | BACnet traffic can be seen on the network and packets are valid | Required if Applicable |
| protocol.bacnet.version | Obtain the version of BACnet client used | The BACnet client implements an up to date version of BACnet | Recommended |
| protocol.valid_modbus | Can valid Modbus traffic be seen | Any Modbus functionality works as expected and valid Modbus traffic can be observed | Recommended |