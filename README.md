<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/google/testrun/badge)](https://securityscorecards.dev/viewer/?uri=github.com/google/testrun)
[![CodeQL](https://github.com/google/testrun/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/google/testrun/actions/workflows/github-code-scanning/codeql)
[![Testrun test suite](https://github.com/google/testrun/actions/workflows/testing.yml/badge.svg?branch=main&event=push)](https://github.com/google/testrun/actions/workflows/testing.yml)

## Introduction :wave:
Testrun automates specific test cases to verify network and security functionality in IoT devices. It is an open source tool which allows manufacturers of IP capable devices to test their devices for the purposes of Device Qualification within the BOS program.

## Motivation :bulb:
Without tools like Testrun, test labs and engineers may need to  maintain a large and complex network coupled with dynamic configuration files and constant software updates. The major issues which can and should be solved are:
 1) The complexity of managing a testing network
 2) The time required to perform testing of network functionality
 3) The accuracy and consistency of testing network functionality

## How it works :triangular_ruler:
Testrun creates an isolated and controlled network environment on a linux machine. This removes the necessity for complex hardware, advanced knowledge and networking experience whilst enabling test engineers to validate device behaviour against Google’s Building Operating System requirements.

Two modes are supported by Testrun:

<details>
  <summary>
    <strong>Automated testing</strong>
  </summary>

Once the device has become operational (steady state), automated testing of the DUT (device under test) will begin. Containerized test modules will then execute against the device, one module at a time. Once all test modules have been executed, a report will be produced - presenting the results.
</details>

<details>

  <summary>
    <strong>Lab network</strong>
  </summary>

When manual testing or configuration changes are required, Testrun will provide the network and some tools to assist an engineer performing the additional testing. This reduces the need to maintain a separate but identical lab network. Testrun will take care of packet captures and logs for each network service for further debugging.

</details>

## Minimum requirements :computer:
### Hardware
 - PC running Ubuntu LTS 20.04, 22.04 or 24.04 (laptop or desktop)
 - 2x USB ethernet adapter (One may be built in ethernet)
 - Internet connection
### Software
- Docker - installation guide: [https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)
### Device under test (DUT)
 - DHCP client - The device must be able to obtain an IP address via DHCP

## Get started ▶️
Once you have met the hardware and software requirements, you can get started with Testrun by following the [Get started guide](docs/get_started.md). Further docs are available in the [docs directory](docs)

## Roadmap :chart_with_upwards_trend:
Testrun will constantly evolve to further support end-users by automating device network behaviour against industry standards. For further information on upcoming features, check out the [Roadmap](docs/roadmap.pdf).

## Accessibility :busts_in_silhouette:
We are proud of our tool and strive to provide an enjoyable experience for all of our users. Testrun goes through rigorous accessibility testing at each release. You can read more about [Google and Accessibility here](https://www.google.co.uk/accessibility). You are welcome to submit a new issue and provide feedback on our implementations. To find out how Testrun implements accessibility features, you can view a [short video here](docs/ui/accessibility.mp4).

## Issue reporting :triangular_flag_on_post:
If the application has come across a problem at any point during setup or use, please raise an issue under the [issues tab](https://github.com/google/testrun/issues). Issue templates exist for both bug reports and feature requests. If neither of these are appropriate for your issue, raise a blank issue instead.

## Contributing :keyboard:
The contributing requirements can be found in [CONTRIBUTING.md](CONTRIBUTING.md). In short, checkout the [Google CLA](https://cla.developers.google.com/) site to get started. After that, check out our [developer documentation](docs/dev/README.md).

## FAQ :raising_hand:
1) I have an issue whilst installing/upgrading Testrun, what do I do?

  Sometimes, issues may arise when installing or upgrading Testrun - this may happen due to one of many reasons due to the nature of the application. However, most of the time, it can be resolved by following a full Testrun re-install by using these commands:
   - ```sudo docker system prune -a```
   - ```sudo apt install ./testrun-*.deb```

2) What device networking functionality is validated by Testrun?

  Best practices and requirements for IoT devices are constantly changing due to technological advances and discovery of vulnerabilities. 
  The current expectations for IoT devices on Google deployments can be found in the [Application Security Requirements for IoT Devices](https://partner-security.withgoogle.com/docs/iot_requirements).
  Testrun aims to automate as much of the Application Security Requirements as possible.

3) What services are provided on the virtual network?

  The following are network services that are containerized and accessible to the device under test though are likely to change over time:
 - DHCP in failover configuration with internet connectivity
 - IPv6 SLAAC
 - DNS
 - NTPv4

4) Can I run Testrun on a virtual machine?

  Testrun can be virtualized if the 2x ethernet adapters are passed through to a VirtualBox VM as a USB device rather than managed network adapters. You can view the guide to working on a [virtual machine here](docs/virtual_machine.md).
