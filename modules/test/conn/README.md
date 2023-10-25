# Connection Test Module

The connection test module runs a collection of tests around the IP and DHCP connectivity between the device and the provided network services.

## What's inside?

The ```bin``` folder contains the startup script for the module.

The ```config/module_config.json``` file provides the name and description of the module, and specifies which tests will be caried out.

Within the ```python/src``` directory, the below tests are executed. A few dhcp utility methods are included in ```python/src/dhcp_util.py```.

## Tests covered

| ID | Description | Expected Behavior | Required Result |
|------------------------------|----------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|
| connection.dhcp.disconnect   | The device under test has received an IP address from the DHCP server and responds to an ICMP echo (ping) request | The device is not set up with a static IP address. The device accepts an IP address from a DHCP server (RFC 2131) and responds successfully to an ICMP echo (ping) request. | Required        |
| connection.dhcp.disconnect_ip_change | Update device IP on the DHCP server and reconnect the device. Does the device receive the new IP address? | Device receives a new IP address within the range specified on the DHCP server. Device should respond to a ping on this new address. | Required        |
| connection.dhcp_address      | The device under test has received an IP address from the DHCP server and responds to an ICMP echo (ping) request | The device is not set up with a static IP address. The device accepts an IP address from a DHCP server (RFC 2131) and responds successfully to an ICMP echo (ping) request. | Required        |
| connection.mac_address       | Check and note device physical address. | N/A | Required |
| connection.mac_oui | The device under test has a MAC address prefix that is registered against a known manufacturer. | The MAC address prefix is registered in the IEEE Organizationally Unique Identifier database. | Required |
| connection.private_address   | The device under test accepts an IP address that is compliant with RFC 1918 Address Allocation for Private Internets. | The device under test accepts IP addresses within all ranges specified in RFC 1918 and communicates using these addresses. The Internet Assigned Numbers Authority (IANA) has reserved the following three blocks of the IP address space for private internets: 10.0.0.0 - 10.255.255.255 (10/8 prefix), 172.16.0.0 - 172.31.255.255 (172.16/12 prefix), 192.168.0.0 - 192.168.255.255 (192.168/16 prefix). | Required |
| connection.shared_address    | Ensure the device supports RFC 6598 IANA-Reserved IPv4 Prefix for Shared Address Space | The device under test accepts IP addresses within the range specified in RFC 6598 and communicates using these addresses. | Required |
| connection.single_ip         | The network switch port connected to the device reports only one IP address for the device under test.               | The device under test does not behave as a network switch and only requests one IP address. This test is to avoid that devices implement network switches that allow connecting strings of daisy-chained devices to one single network port, as this would not make 802.1x port-based authentication possible. | Required        |
| connection.target_ping       | The device under test responds to an ICMP echo (ping) request.                                                      | The device under test responds to an ICMP echo (ping) request.                                                                                                        | Required        |
| connection.ipaddr.ip_change  | The device responds to a ping (ICMP echo request) to the new IP address it has received after the initial DHCP lease has expired. | If the lease expires before the client receives a DHCPACK, the client moves to the INIT state, MUST immediately stop any other network processing, and requires network initialization parameters as if the client were uninitialized. If the client then receives a DHCPACK allocating the client its previous network address, the client SHOULD continue network processing. If the client is given a new network address, it MUST NOT continue using the previous network address and SHOULD notify the local users of the problem. | Required        |
| connection.ipaddr.dhcp_failover | The device has requested a DHCPREQUEST/REBIND to the DHCP failover server after the primary DHCP server has been brought down. |                                                                                                                                                                       | Required        |
| connection.ipv6_slaac        | The device forms a valid IPv6 address as a combination of the IPv6 router prefix and the device interface identifier | The device under test complies with RFC4862 and forms a valid IPv6 SLAAC address.                                                                                    | Required        |
| connection.ipv6_ping         | The device responds to an IPv6 ping (ICMPv6 Echo) request to the SLAAC address                                      | The device responds to the ping as per RFC4443                                                                                                                        | Required        |
