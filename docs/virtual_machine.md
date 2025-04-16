<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

# Run on a virtual machine

This page provides steps to use Testrun within a virtual machine in VirtualBox. VMWare and other providers haven't been tested yet. You should use these instructions alongside the [Get started guide](/docs/get_started.md).

# Prerequisites

## Hardware

Before you start with Testrun, ensure you have the following hardware:

-  PC running any OS that supports VirtualBox
-  2x USB Ethernet adapter (built-in Ethernet connections aren't supported)
-  Internet connection

## Software

Ensure you have VirtualBox installed on the host PC. Then, install the following software on your virtual machine:

-  Ubuntu LTS (22.04 or 24.04)
-  Docker
    -  Refer to the [installation guide](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository) as needed. 

# Installation

As part of installation, you must add the default user to the sudo group:

1. Open a terminal and run `sudo su` to log in as root.
1. Enter your password when prompted.
1. Add the default user to the sudo group by running `adduser {username} sudo`.
1. Restart the virtual machine.
1. Follow the steps in the [Get started guide](/docs/get_started.md) to complete the installation.

# Start Testrun

Follow these steps to start Testrun. Keep in mind that attaching USB Ethernet adapters is different when working in a virtual machine.

1. Ensure the 2x adapters are attached to the host PC.
1. With the virtual machine running, right-click the **USB** icon in the bottom-right of the window.
1. Select the 2x Ethernet adapter names. The two adapters should now appear in the virtual machine.