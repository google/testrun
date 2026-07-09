<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

# Device Compliance Guide

To achieve **Compliant** status, devices must successfully pass automated checks across 6 key categories: Network Connection, Time Synchronization, Name Resolution, Supported Protocols, Network Services Security, and Encryption (TLS).

Below is the complete list of requirements, expected behaviors, and recommendations for resolving potential failures.

---

## 1. Network Connection (Connection)

The device must interact correctly with L2/L3 network infrastructure and standard IP allocation mechanisms.

### Physical Layer and Negotiation
* **Port Link:** When an Ethernet cable is connected, the device must successfully bring the link up (Link UP state, LEDs illuminated). The switch port must register no errors (such as CRC errors or collisions).
    * *Troubleshooting Recommendation:* Check the physical connection and integrity of the Ethernet cable.
* **Port Speed & Duplex:** The device must automatically negotiate (Auto-negotiation) a port speed of **10 Mbps or higher** and **Full-Duplex** mode. Hardcoding static speed/duplex settings on the device is prohibited.
    * *Troubleshooting Recommendation:* Ensure Auto-negotiation is enabled on both the device and the switch port.

### IPv4 and DHCP Protocols
* **IP Address Allocation (DHCP Address):** Static IP configurations by default are not compliant. The device must accept network parameters from a DHCP server (RFC 2131) and successfully respond to ICMP Echo Requests (ping).
* **Link Reconnection (DHCP Disconnect):** Upon physical disconnection and reconnection of the network cable, the device **must** issue a new `DHCPREQUEST` packet to verify or reacquire its IP address parameters.
* **IP Change on Reconnection (DHCP Disconnect IP Change):** If the device's IP address reservation is changed on the DHCP server while the device is disconnected, it must request and update to the new IP address upon reconnecting (and properly handle `DHCPNAK` messages).
* **Lease Lifecycle (IP Change):** If the initial DHCP lease expires before a new `DHCPACK` is received, the device must transition to the `INIT` state, immediately stop all other network processing, and reinitialize. If given a new network address, it must immediately stop using the previous address and respond to pings on the new IP.
* **DHCP Failover:** The device must successfully issue a `DHCPREQUEST` / `REBIND` to the backup/failover DHCP server if the primary DHCP server goes down.
* **Single IP per Port (Single IP):** The device must request exactly **one** IP address. The device must not act as an unmanaged network switch or allow daisy-chaining multiple devices on a single port, as this prevents proper 802.1x port-based authentication.
    * *Troubleshooting Recommendation:* Ensure all network ports on the device are isolated and only one DHCP client is running.

### Address Space Support
* **Private Address Space (RFC 1918):** The device must seamlessly operate within the following private IP ranges:
    * `10.0.0.0/8`
    * `172.16.0.0/12`
    * `192.168.0.0/16`
* **Shared Address Space (RFC 6598):** Guaranteed support for Carrier-Grade NAT (CGNAT) ranges: `100.64.0.0/10`.

### IPv6
* **SLAAC Addressing (IPv6 SLAAC):** The device must automatically form a valid IPv6 address combining the IPv6 router prefix and its own interface identifier in compliance with RFC 4862.
* **IPv6 Ping:** The device must respond to ICMPv6 Echo Requests sent to its SLAAC address (RFC 4443).
    * *Troubleshooting Recommendation:* Enable ping response to IPv6 ICMP requests in your network manager and create a firewall exception to allow ICMPv6 via LAN.

### Switching Security
* **ARP Inspection:** The device must continue to operate correctly with no functionality lost when Dynamic ARP Inspection (DAI) is enabled on the network switch (RFC 826).
    * *Troubleshooting Recommendation:* Remove secondary IP addresses (IP aliases), disable virtual network bridges (Docker/LXC), and flush the ARP cache if necessary.
* **DHCP Snooping:** The device must operate correctly as a DHCP client when connected to an "untrusted" switch port with DHCP Snooping enabled.

---

## 2. Time Synchronization (NTP)

* **NTPv4 Support:** The device must act as an NTP client and request network time synchronization using **NTPv4** (RFC 5905) sent to the configured NTP server.
* **NTP via DHCP (NTP DHCP):** The device must support automatically fetching NTP server addresses via DHCP options (DHCP Option 42) or from trusted public sources.
    * *Troubleshooting Recommendation:* Change the NTP setting from 'Static/Manual' to 'Automatic/DHCP', delete any hardcoded public IPs, and restart the NTP daemon.

---

## 3. Name Resolution (DNS)

* **Hostname Resolution:** The device must successfully initiate DNS requests to resolve domain names.
* **DNS from DHCP:** The device must automatically apply and send DNS requests to the DNS servers provided by the DHCP server options.
* **Multicast DNS (mDNS):** The device may send mDNS requests for local discovery (treated as informational).
    * *Troubleshooting Recommendation:* Check if the network switch has IGMP Snooping enabled, which might block multicast traffic, and ensure the device is on an allowed multicast segment.

---

## 4. Automation and Industrial Protocols (Protocol)

If the device utilizes automation protocols, they must adhere to standard specifications:

* **BACnet Traffic:** Valid BACnet traffic must be observed with zero malformed packets or checksum errors. The BACnet client must implement an up-to-date protocol revision (ASHRAE 135).
* **Modbus TCP:** Modbus functionality must operate as expected. The testing framework scans the following default blocks:
    * *Holding Registers:* Address 0, count 5
    * *Input Registers:* Address 0, count 5
    * *Coils:* Address 0, count 1
    * *Discrete Inputs:* Address 0, count 1
    * *Troubleshooting Recommendation:* Set the Default Unit ID (Slave ID) to `1` to match the test configuration. Populate the Modbus map with readable registers, allow anonymous access (standard Modbus does not support auth), and verify the TCP connection limit is not saturated by SCADA/HMI clients.

---

## 5. Network Services Security (Services / Open Ports)

The system performs an automated port scan using `nmap`. To achieve compliance, **all unsecure, unencrypted, or unused services must be disabled**.

| Port / Protocol | Service | Required State for Compliance | Recommendation |
| :--- | :--- | :--- | :--- |
| **20, 21 (TCP/UDP)** | FTP | **Prohibited** (Must be disabled) | Disable the FTP server; switch to a secure SFTP server instead. |
| **22 (TCP)** | SSH | **Allowed** (Only if SSHv2 is used) | Upgrade the SSH server to at least protocol 2.0; disable if unused. |
| **23 (TCP/UDP)** | Telnet | **Prohibited** (Must be disabled) | Disable the Telnet server completely; use SSH instead. |
| **25, 465, 587 (TCP)**| SMTP | **Prohibited** (Must be disabled) | Disable any local Mail Transfer Agents (SMTP). |
| **80 (TCP/UDP)** | HTTP | **Prohibited** (Unencrypted web interface) | Disable unsecure HTTP; enforce HTTPS on port 443. |
| **443 (TCP/UDP)** | HTTPS | **Allowed** | Main designated port for secure web management. |
| **109, 110, 995** | POP / POP3S | **Prohibited** (Must be disabled) | Disable the POP service. |
| **143, 220, 585, 993**| IMAP / IMAPS| **Prohibited** (Must be disabled) | Disable the IMAP service. |
| **161, 162 (TCP/UDP)**| SNMP | **Prohibited** for v1/v2c. **Allowed only for SNMPv3.** | Disable SNMP, or upgrade to SNMPv3 with proper auth/privacy if essential. |
| **5800-5803, 5900-5903**| VNC | **Prohibited** (Must be disabled) | Disable the VNC server completely. |
| **69, 3713 (TCP/UDP)**| TFTP | **Prohibited** (Must be disabled) | Disable the unsecure TFTP server. |
| **123 (UDP)** | NTP Server | **Prohibited** (Device must not act as a server) | Ensure the device does not respond to NTP requests; drop inbound traffic on port 123/udp. |
| **47808 (UDP)** | BACnet Server| **Allowed** (If applicable) | Verify the BACnet service is enabled, properly initialized, and firewall exceptions allow UDP 47808. |

---

## 6. Encryption and Certificates (TLS)

Strict cryptographic standards apply to all inbound and outbound traffic via web interfaces or external APIs:

### Outbound Connections (Device as a Client)
* When connecting to external web services on port 443 (or other HTTPS endpoints), the device **must** use **TLS 1.2** or **TLS 1.3**.
* For TLS 1.2 connections, the client handshake must include support for modern cipher suites using **ECDH** (Elliptic Curve Diffie-Hellman) and **ECDSA** (Elliptic Curve Digital Signature Algorithm).
* Fallback to legacy protocols (SSLv3, TLS 1.0, TLS 1.1) will trigger a compliance failure.

### Inbound Connections (Device as a Server / Web Interface)
* The device's embedded web server must support connections via **TLS 1.2** and/or **TLS 1.3**.
* **TLS 1.0 and TLS 1.1 must be explicitly disabled** within the web server configuration.
* The TLS certificate presented by the web server must be valid and signed by a trusted (or test-environment designated) Certificate Authority (CA).