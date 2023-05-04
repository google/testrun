<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Test Run">

## Introduction :wave:
The network orchestrator is a tool to automate the management of a test lab network and provide essential services to begin device testing in just a few minutes.

## Motivation :bulb:
Test labs may be maintaining a large and complex network using equipment such as: A managed layer 3 switch, an enterprise-grade network router, virtualized or physical servers to provide DNS, NTP, 802.1x etc. With this amount of moving parts, all with dynamic configuration files and constant software updates, more time is likely to be spent on preparation and clean up of functinality or penetration testing - not forgetting the number of software tools required to perform the testing.

## How it works :triangular_ruler:
The network orchestrator creates an isolated and controlled network environment to fully simulate enterprise network deployments in your device testing lab. 
This removes the necessity for complex hardware, advanced knowledge and networking experience whilst enabling semi-technical engineers to validate device 
behaviour against industry cyber standards. 

The network orchestrator will provide the network and some tools to assist an engineer performing the additional testing. At the same time, packet captures of the device behaviour will be recorded, alongside logs for each network service, for further debugging.

## Minimum Requirements :computer:
### Hardware
 - PC running Ubuntu LTS (laptop or desktop)
 - 2x USB ethernet adapter (One may be built in ethernet)
    - Connect one adapter to your router (for internet access)
    - Connect one adapter to your device under test
 - Internet connection
### Software
 - Python 3 with pip3 (Already available on Ubuntu LTS)
 - Docker - [Install guide](https://docs.docker.com/engine/install/ubuntu/)
 - Open vSwitch ``sudo apt-get install openvswitch-common openvswitch-switch``

An additional network interface (even wifi) with internet access can be used to maintain internet connection during use of the network orchestrator.

## How to use :arrow_forward:
1) Ensure you have a device with the minimum hardware and software requirements setup
2) Clone the project using ```git clone https://github.com/auto-iot/network-orchestrator```
3) Navigate into the project using ```cd network-orchestrator```
4) Copy conf/system.json.example to conf/system.json (after setting the correct interfaces in the file)
5) Start the tool using ```sudo cmd/start```

## Issue reporting :triangular_flag_on_post:
If the application has come across a problem at any point during setup or use, please raise an issue under the [issues tab](https://github.com/auto-iot/network-orchestrator/issues). Issue templates exist for both bug reports and feature requests. If neither of these are appropriate for your issue, raise a blank issue instead.

## Roadmap :chart_with_upwards_trend:
 - Ability to modify configuration files of each network service during use (via GRPC)
 - IPv6 internet routing

## Contributing :keyboard:
The contributing requirements can be found in [CONTRIBUTING.md](CONTRIBUTING.md). In short, checkout the [Google CLA](https://cla.developers.google.com/) site to get started.

## FAQ :raising_hand:
1) What services are provided on the virtual network?

  The following are network services that are containerized and accessible to the device under test though are likely to change over time:
 - DHCP in failover configuration with internet connectivity
 - IPv6 router advertisements
 - DNS (and DNS over HTTPS)
 - NTPv4
 - 802.1x Port Based Authentication
  
2) Can I run the network orchestrator on a virtual machine?

  Probably. Provided that the required 2x USB ethernet adapters are passed to the virtual machine as USB devices rather than network adapters, the tool should
  still work. We will look to test and approve the use of virtualisation in the future.

3) Can I connect multiple devices to the Network Orchestrator?

  In short, Yes you can. The way in which multiple devices could be tested simultaneously is yet to be decided. However, if you simply want to add field/peer devices during runtime (even another laptop performing manual testing) then you may connect the USB ethernet adapter to an unmanaged switch.
  
4) Raise an issue with the label 'question' if your question has not been answered in this readme.