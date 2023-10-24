<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/google/testrun/badge)](https://securityscorecards.dev/viewer/?uri=github.com/google/testrun)
[![CodeQL](https://github.com/google/testrun/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/google/testrun/actions/workflows/github-code-scanning/codeql)
[![Testrun test suite](https://github.com/google/testrun/actions/workflows/testing.yml/badge.svg?branch=main&event=push)](https://github.com/google/testrun/actions/workflows/testing.yml)

## Introduction :wave:
Testrun automates specific test cases to verify network and security functionality in IoT devices. It is an open source tool which allows external manufacturers to test their devices for the purposes of Device Qualification within the BOS program.

## Motivation :bulb:
Without tools like Testrun, testing labs may be maintaining a large and complex network using equipment such as: A managed layer 3 switch, an enterprise-grade network router, virtualized or physical servers to provide DNS, NTP, 802.1x etc. With this amount of moving parts, all with dynamic configuration files and constant software updates, more time is likely to be spent on preparation and clean up of functinality or penetration testing - not forgetting the number of software tools required to perform the testing. The major issues which can and should be solved:
 1) The complexity of managing a testing network
 2) The time required to perform testing of network functionality
 3) The accuracy and consistency of testing network functionality

## How it works :triangular_ruler:
Testrun creates an isolated and controlled network environment to fully simulate enterprise network deployments in your device testing lab. 
This removes the necessity for complex hardware, advanced knowledge and networking experience whilst enabling semi-technical engineers to validate device 
behaviour against industry cyber standards. 

Two runtime modes are supported by Testrun:

1) <strong>Automated testing</strong>

Once the device has become operational (steady state), automated testing of the device under test will begin. Containerized test modules will then execute against the device (one module at a time). Once all test modules have completed execution, a final test report will be produced - presenting the results and further description of findings.

2) <strong>Lab network</strong>

Testrun cannot automate everything, and so additional manual testing may be required (or configuration changes may be required on the device). Rather than having to maintain a separate but idential lab network, Testrun will provide the network and some tools to assist an engineer performing the additional testing. At the same time, packet captures of the device behaviour will be recorded, alongside logs for each network service, for further debugging.

## Minimum requirements :computer:
### Hardware
 - PC running Ubuntu LTS (laptop or desktop)
 - 2x USB ethernet adapter (One may be built in ethernet)
 - Internet connection
### Software
- Docker - installation guide: [https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)

## Get started ▶️
Once you have met the hardware and software requirements, you can get started with Testrun by following the [Get started guide](docs/get_started.md).

## Roadmap :chart_with_upwards_trend:
Testrun will constantly evolve to further support end-users by automating device network behaviour against industry standards.

## Issue reporting :triangular_flag_on_post:
If the application has come across a problem at any point during setup or use, please raise an issue under the [issues tab](https://github.com/auto-iot/test-run/issues). Issue templates exist for both bug reports and feature requests. If neither of these are appropriate for your issue, raise a blank issue instead.

## Contributing :keyboard:
The contributing requirements can be found in [CONTRIBUTING.md](CONTRIBUTING.md). In short, checkout the [Google CLA](https://cla.developers.google.com/) site to get started.

## FAQ :raising_hand:
1) What device networking functionality is validated by Testrun?

  Best practices and requirements for IoT devices are constantly changing due to technological advances and discovery of vulnerabilities. 
  The current expectations for IoT devices on Google deployments can be found in the [Application Security Requirements for IoT Devices](https://partner-security.withgoogle.com/docs/iot_requirements).
  Testrun aims to automate as much of the Application Security Requirements as possible.

2) What services are provided on the virtual network?

  The following are network services that are containerized and accessible to the device under test though are likely to change over time:
 - DHCP in failover configuration with internet connectivity
 - IPv6 SLAAC
 - DNS
 - NTPv4
 - 802.1x Port Based Authentication
  
3) Can I run Testrun on a virtual machine?

  Probably. Provided that the required 2x USB ethernet adapters are passed to the virtual machine as USB devices rather than network adapters, Testrun should
  still work. We will look to test and approve the use of virtualisation to run Testrun in the future.

 4) Can I connect multiple devices to Testrun?

  In short, Yes you can. The way in which multiple devices could be tested simultaneously is yet to be decided. However, if you simply want to add field/peer devices during runtime (even another laptop performing manual testing) then you may connect the USB ethernet adapter to an unmanaged switch.
