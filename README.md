<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/google/testrun/badge)](https://securityscorecards.dev/viewer/?uri=github.com/google/testrun)
[![CodeQL](https://github.com/google/testrun/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/google/testrun/actions/workflows/github-code-scanning/codeql)
[![Testrun test suite](https://github.com/google/testrun/actions/workflows/testing.yml/badge.svg?branch=main&event=push)](https://github.com/google/testrun/actions/workflows/testing.yml)

# Introduction :wave:

Testrun automates specific test cases to verify network and security functionality in IoT devices. It's an open-source tool that manufacturers use to test their IP-capable devices for the purpose of device qualification within Google's Building Operating System  (BOS) program.

# Motivation :bulb:

Test labs and engineers often need to maintain a large and complex network coupled with dynamic configuration files and constant software updates. Testrun helps address major issues like:

-  The complexity of managing a testing network
-  The time required to perform testing of network functionality
-  The accuracy and consistency of testing network functionality

# How it works :triangular_ruler:

Testrun creates an isolated and controlled network environment on a Linux machine. This removes the necessity for complex hardware, advanced knowledge, and networking experience while enabling test engineers to validate device behavior against Google's BOS requirements.

Testrun supports two modes: automated testing and lab network.

## Automated testing

Automated testing of the device under test (DUT) begins once the device is operational (steady state). Containerized test modules execute against the device one module at a time. Testrun produces a report with the results after all modules are executed.

## Lab network

Testrun provides the network and assistive tools for engineers when manual testing or configuration changes are required, reducing the need to maintain a separate but identical lab network. Testrun handles packet captures and logs for each network service for further debugging.

# Minimum requirements :computer:

## Hardware

-  PC running Ubuntu LTS 22.04 or 24.04 (laptop or desktop)
-  2x ethernet ports (USB ethernet adapters work too)
-  Internet connection

## Software

Testrun requires Docker. Refer to the [installation guide](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository) for more information.

## Device under test (DUT)

The DUT must be able to obtain an IP address via DHCP.

# Get started :arrow_forward:

Once you meet the hardware and software requirements, follow the Testrun [Get started guide](/docs/get_started.md). Additional guidance is available in the [docs directory](/docs).

# Roadmap :chart_with_upwards_trend:

Testrun continually evolves to further support end users by automating device network behavior against industry standards. For information on upcoming features, check out the [Roadmap](/docs/roadmap.pdf).

# Accessibility :busts_in_silhouette:

We're proud of our tool and strive to provide an enjoyable experience for everyone. Testrun goes through rigorous accessibility testing at each release. Download the [Testrun: Accessible features](https://github.com/google/testrun/raw/refs/heads/main/docs/ui/accessibility.mp4) video to learn more.You're welcome to [submit a new issue](https://github.com/google/testrun/issues) and provide feedback on our implementations. To learn more about Google's [Belonging initiative](https://www.google.co.uk/accessibility) and their approach to accessibility, visit their site.

# Issue reporting :triangular_flag_on_post:

If you encounter a problem during setup or use, raise an issue under the [Issues tab](https://github.com/google/testrun/issues). Issue templates exist for both bug reports and feature requests. If neither of these apply, raise a blank issue instead.

# Contributing :keyboard:

We strongly encourage contributions from the community. Review the requirements on the  ["How to Contribute" page](CONTRIBUTING.md), then follow the [developer guidelines](/docs/dev/README.md). 

# FAQ :raising_hand:

#### 1. What should I do if I have an issue while installing or upgrading Testrun?

 You can resolve most issues by reinstalling Testrun using these commands:
- `sudo docker system prune -a`
- `sudo apt install ./testrun*.deb`

If this doesn't resolve the problem, [raise an issue](https://github.com/google/testrun/issues).

#### 2. What device networking functionality does Testrun validate?

Best practices and requirements for IoT devices change often due to technological advances and discovery of vulnerabilities. You can find the current expectations for IoT devices on Google deployments in the [Application Security Requirements for IoT Devices](https://partner-security.withgoogle.com/docs/iot_requirements). Testrun aims to automate as much of the Application Security Requirements as possible.

#### 3. What services are provided on the virtual network?

The following network services are containerized and accessible to the DUT:

-  DHCP in failover configuration with internet connectivity
-  IPv6 SLAAC
-  DNS
-  NTPv4

Note that this list is likely to change over time.

#### 4. Can I run Testrun on a virtual machine?

Testrun can be virtualized if the 2x Ethernet adapters are passed through to a VirtualBox VM as a USB device rather than managed network adapters. Visit the [virtual machine guide](/docs/virtual_machine.md) for additional details.