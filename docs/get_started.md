# Getting Started

## Prerequisites

### Hardware

Before starting with Test Run, ensure you have the following hardware:

- PC running Ubuntu LTS (laptop or desktop)
- 2x USB Ethernet adapter (one may be a built-in Ethernet port)
- Internet connection

### Software

Ensure the following software is installed on your Ubuntu LTS PC:

- Python 3 (already available on Ubuntu LTS)
- Docker - Installation Guide: [https://docs.docker.com/engine/install/](https://docs.docker.com/engine/install/)
- Open vSwitch ``sudo apt-get install openvswitch-common openvswitch-switch``

## Installation

1. Download Test Run from the releases page or the appropriate source.

2. Run the install script.

## Configuration

1. Copy the default configuration file.

2. Open the `local/system.json` file and modify the configuration as needed. Specify the interface names for the internet and device interfaces.

## Test Your Device

1. Attach network interfaces:

   - Connect one USB Ethernet adapter to the internet source (e.g., router or switch) using an Ethernet cable.
   - Connect the other USB Ethernet adapter directly to the IoT device you want to test using an Ethernet cable.

2. Start Test Run.

   - To run Test Run in network-only mode (without running any tests), use the `--net-only` option.

   - To skip network validation before use and not launch the faux device on startup, use the `--no-validate` option.

# Troubleshooting

If you encounter any issues or need assistance, consider the following:

- Ensure that all hardware and software prerequisites are met.
- Verify that the network interfaces are connected correctly.
- Check the configuration in the `local/system.json` file.
- Refer to the Test Run documentation or ask for further assistance from the support team.
