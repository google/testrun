# Virtual Machine

This guide will provide steps to use Testrun within a virtual machine in virtual Box (VMWare and other providers have not yet been tested). You should use this guide alongside the [Get Started guide](/docs/get_started.md) - only differences will be outlined in this guide.

## Prerequisites

### Hardware

Before starting with Testrun, ensure you have the following hardware:
- PC running any OS that supports Virtual Box
- 2x USB Ethernet adapter (built in ethernet connections are not supported)
- Internet connection

### Software

Ensure the following software is installed on the host PC:
 - Virtual Box

Ensure the following software is installed on your virtual machine:
- Ubuntu LTS (22.04 or 20.04)
- Docker - installation guide: [https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)

## Installation

In addition to the install steps provided in the Get Started guide, the default user must be added to the sudo group.
1. Open a terminal and run ```sudo su``` to login as root (you will be prompted for your password).
2. Add the default user to the sudo group by running ```adduser {username} sudo```.
3. Restart the virtual machine.
4. Continue the installation as per the Get Started guide.

## Start Testrun

Attaching USB ethernet adapters is different when working in a Virtual Machine. 
1. Ensure the 2x adapters are attached to the host PC.
2. With the virtual machine running, right click the USB icon in the bottom right of the window.
3. Select the 2x ethernet adapter names and check that these two adapters have now appeared in the virtual machine.