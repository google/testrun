<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

## Network Overview

## Table of Contents
1) Network overview (this page)
2) [How to identify network interfaces](identify_interfaces.md)
3) [Addresses](addresses.md)
4) [Add a new network service](add_new_service.md)

Testrun provides several built-in network services that can be utilized for testing purposes. These services are already available and can be used without any additional configuration. 

The following network services are provided:

### Internet Connectivity (Gateway Service)

The gateway service provides internet connectivity to the test network. It allows devices in the network to access external resources and communicate with the internet.

### DHCPv4 Service

The DHCPv4 service provides Dynamic Host Configuration Protocol (DHCP) functionality for IPv4 addressing. It includes the following components:

- Primary DHCP Server: A primary DHCP server is available to assign IPv4 addresses to DHCP clients in the network.
- Secondary DHCP Server (Failover Configuration): A secondary DHCP server operates in failover configuration with the primary server to provide high availability and redundancy.

#### Configuration

The configuration of the DHCPv4 service can be modified using the provided GRPC (gRPC Remote Procedure Call) service.

### IPv6 SLAAC Addressing

The primary DHCP server also provides IPv6 Stateless Address Autoconfiguration (SLAAC) addressing for devices in the network. IPv6 addresses are automatically assigned to devices using SLAAC where test devices support it.

### NTP Service

The Network Time Protocol (NTP) service provides time synchronization for devices in the network. It ensures that all devices have accurate and synchronized time information.

### DNS Service

The DNS (Domain Name System) service resolves domain names to their corresponding IP addresses. It allows devices in the network to access external resources using domain names.

### 802.1x Authentication (Radius Module)

The radius module provides 802.1x authentication for devices in the network. It ensures secure and authenticated access to the network. The issuing CA (Certificate Authority) certificate can be specified by the user if required.