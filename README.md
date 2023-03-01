# <img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Test Run">

A tool to automate the validation of network-based functionality of IoT devices.

## Minimum Requirements
### Hardware
 - PC running Ubuntu LTS (laptop or desktop)
 - 2x USB ethernet adapter (One may be built in ethernet)
 - Internet connection
### Software
 - Python 3 (Already available on Ubuntu LTS)
 - Docker - [Install guide](https://docs.docker.com/engine/install/ubuntu/)
 - Open vSwitch ``sudo apt-get install openvswitch-common openvswitch-switch``

## How it works
Test Run creates an isolated and controlled network environment to fully simulate enterprise network deployments in your device testing lab. 
This removes the necessity for complex hardware, advanced knowledge and networking experience whilst enabling semi-technical engineers to validate device 
behaviour against industry cyber standards.

## Contributing
The contributing requirements can be found in [CONTRIBUTING.md](CONTRIBUTING.md).

## FAQ
1) What device networking functionality is validated by Test Run?

  Best practices and requirements for IoT devices are constantly changing due to technological advances and discovery of vulnerabilities. 
  The current expectations for IoT devices on Google deployments can be found in the [Application Security Requirements for IoT Devices](https://partner-security.withgoogle.com/docs/iot_requirements).
  Test Run aims to automate as much of the Application Security Requirements as possible.

2) What services are provided on the virtual network?

  The following are network services that are containerized and accessible to the device under test though are likely to change over time:
 - DHCP in failover configuration with internet connectivity
 - DNS (and DNS over HTTPS)
 - NTPv4
 - 802.1x Port Based Authentication
  
3) Can I run Test Run on a virtual machine?

  Probably. Provided that the required 2x USB ethernet adapters are passed to the virtual machine as USB devices rather than network adapters, Test Run should
  still work. We will look to test and approve the use of virtualisation to run Test Run in the future.
