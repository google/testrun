# NTP Test Module

The NTP test module verifies the device behavior when syncing time with an NTP server.

## What's inside?

The ```bin``` folder contains the startup script for the module.

The ```config/module_config.json``` provides the name and description of the module, and specifies which tests will be caried out.

Within the ```python/src``` directory, the below tests are executed.

## Tests covered

| ID | Description | Expected behavior | Required result
|---|---|---|---|
| ntp.network.ntp_support | Does the device request network time using NTPv4 | The device sends an NTPv4 request to the configured NTP server | Required |
| ntp.network.ntp_dhcp | Checks the device can accept an NTP server address from the DHCP server | Device can accept NTP server address and sends an NTP request to that server | Roadmap |