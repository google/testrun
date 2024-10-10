<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

# Network addresses

Each network service is configured with an IPv4 and IPv6 address. For IPv4 addressing, the last number in the IPv4 address is fixed, ensuring the IP is unique. The table below lists network addresses you might need.

| Name              | MAC address       | IPv4 address  | IPv6 address        |
| ----------------- | ----------------- | ------------- | ------------------- |
| Internet gateway  | 9a\:02\:57\:1e\:8f\:01 | 10.10.10.1    | fd10\:77be\:4186\:\:1 |
| DHCP primary      | 9a\:02\:57\:1e\:8f\:02 | 10.10.10.2    | fd10\:77be\:4186\:\:2 |
| DHCP secondary    | 9a\:02\:57\:1e\:8f\:03 | 10.10.10.3    | fd10\:77be\:4186\:\:3 |
| DNS server        | 9a\:02\:57\:1e\:8f\:04 | 10.10.10.4    | fd10\:77be\:4186\:\:4 |
| NTP server        | 9a\:02\:57\:1e\:8f\:05 | 10.10.10.5    | fd10\:77be\:4186\:\:5 |
| Radius authenticator | 9a\:02\:57\:1e\:8f\:07 | 10.10.10.7    | fd10\:77be\:4186\:\:7 |
| Active test module | 9a\:02\:57\:1e\:8f\:09 | 10.10.10.9    | fd10\:77be\:4186\:\:9 |

The default network range is 10.10.10.0/24 and devices are assigned addresses in that range via DHCP. The range may change when requested by a test module. In that case, network services restart and are accessible on the new range with the same final host ID. The default IPv6 network is fd10:77be:4186::/64 and addresses are assigned to devices on the network using IPv6 SLAAC.

When creating a new network module, ensure that the ip_index value in the module_config.json is unique to prevent unexpected behavior. 