<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

# Network

This page provides an overview of Testrun's network services. Visit these pages for additional information: 

-  [Network addresses](/docs/network/addresses.md)
-  [Add a new network service](/docs/network/add_new_service.md)

Testrun provides several built-in network services you can use for testing purposes. These services don't require any additional configuration. Below is a list and brief description of the network services provided.

# Internet connectivity (gateway service)

The gateway service provides internet connectivity to the test network. It allows devices in the network to access external resources and communicate with the internet.

# DHCPv4 service

The DHCPv4 service provides Dynamic Host Configuration Protocol (DHCP) functionality for IPv4 addressing. It includes the following components:

-  Primary DHCP server: Assigns IPv4 addresses to DHCP clients in the network.
-  Secondary DHCP server (failover configuration): Operates in failover configuration with the primary server to provide high availability and redundancy.

## Configuration

You can modify the configuration of the DHCPv4 service using the provided Remote Procedure Call (GRPC) service.

# IPv6 SLAAC addressing

The primary DHCP server provides IPv6 Stateless Address Autoconfiguration (SLAAC) addressing for devices on the network. It automatically assigns IPv6 addresses to devices using SLAAC where test devices support it.

# NTP service

The Network Time Protocol (NTP) service provides time synchronization for devices on the network. It ensures that all devices have accurate and synchronized time information.

# DNS service

The Domain Name System (DNS) service resolves domain names to their corresponding IP addresses. It allows devices on the network to access external resources using domain names.

# 802.1x authentication (radius module)

The radius module provides 802.1x authentication for devices on the network. It ensures secure and authenticated access to the network. The user can specify the issuing Certificate Authority (CA) certificate if required.