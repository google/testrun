# Getting Started

## Prerequisites

### Hardware

Before starting with Testrun, ensure you have the following hardware:

- PC running Ubuntu LTS (laptop or desktop)
- 2x USB Ethernet adapter (one may be a built-in Ethernet port)
- Internet connection

### Software

Ensure the following software is installed on your Ubuntu LTS PC:
- Python3 libraries: ``sudo apt-get install python3-dev python3-venv``
- Docker - installation guide: [https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)
- System dependencies: ``sudo apt-get install openvswitch-common openvswitch-switch build-essential net-tools``

## Installation

1. Download the latest version of Testrun from the [releases page](https://github.com/google/test-run/releases)

2. Install the package using ``sudo dpkg -i testrun_*.deb``

## Test Your Device

1. Attach network interfaces:

   - Connect one USB Ethernet adapter to the internet source (e.g., router or switch) using an Ethernet cable.
   - Connect the other USB Ethernet adapter directly to the IoT device you want to test using an Ethernet cable.

   **NOTE: Both adapters should be disabled in the host system. You can do this by going to Settings > Network** 

2. Start Testrun.

Start Testrun with the command `sudo testrun`

   - To run Testrun in network-only mode (without running any tests), use the `--net-only` option.

   - To skip network validation before use and not launch the faux device on startup, use the `--no-validate` option.

# Troubleshooting

If you encounter any issues or need assistance, consider the following:

- Ensure that all hardware and software prerequisites are met.
- Verify that the network interfaces are connected correctly.
- Check the configuration settings.
- Refer to the Test Run documentation or ask for further assistance from the support team.
