# Getting Started

## Prerequisites

### Hardware

Before starting with Testrun, ensure you have the following hardware:

- PC running Ubuntu LTS (laptop or desktop)
- 2x USB Ethernet adapter (one may be a built-in Ethernet port)
- Internet connection

### Software

Ensure the following software is installed on your Ubuntu LTS PC:
- Docker - installation guide: [https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)
- System dependencies (These will be installed automatically when installing Testrun if not already installed): 
   - Python3-dev
   - Python3-venv
   - Openvswitch Common
   - Openvswitch Switch
   - Build Essential
   - Net Tools

## Installation

1. Download the latest version of Testrun from the [releases page](https://github.com/google/test-run/releases)

2. Install the package using ``sudo apt install ./testrun*.deb``

## Test Your Device

1. Attach network interfaces:

   - Connect one USB Ethernet adapter to the internet source (e.g., router or switch) using an Ethernet cable.
   - Connect the other USB Ethernet adapter directly to the IoT device you want to test using an Ethernet cable.

   **NOTE: Both adapters should be disabled in the host system (IPv4, IPv6 and general). You can do this by going to Settings > Network** 

2. Start Testrun.

Start Testrun with the command `sudo testrun --no-validate`

   - To run Testrun in network-only mode (without running any tests), use the `--net-only` option.

   - To skip network validation before use and not launch the faux device on startup, use the `--no-validate` option.

   - To run Testrun with just one interface (connected to the device), use the ``--single-intf`` option.

# Troubleshooting

If you encounter any issues or need assistance, consider the following:

- Ensure that all hardware and software prerequisites are met.
- Verify that the network interfaces are connected correctly.
- Check the configuration settings.
- Refer to the Testrun documentation or ask for assistance in the issues page: https://github.com/google/testrun/issues
