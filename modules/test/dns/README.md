# DNS Test Module

The DNS test module inspects the device's behavior when attempting to resolve hostnames.

## What's inside?

The ```bin``` folder contains the startup script for the module.

The ```config/module_config.json``` provides the name and description of the module, and specifies which tests will be caried out.

Within the ```python/src``` directory, the below tests are executed.

## Tests covered

| ID | Description | Expected behavior | Required result
|---|---|---|---|
| dns.network.hostname_resolution | Verifies that the device resolves hostnames | The device sends DNS requests | Required |
| dns.network.from_dhcp | Verifies that the device allows for a DNS server to be provided by the DHCP server | The device sends DNS requests to the DNS server provided by the DHCP server | Informational |
| dns.mdns | Does the device has MDNS | Device may send MDNS requests | Informational |