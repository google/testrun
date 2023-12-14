# Getting Started

It is recommended that you run Testrun on a standalone machine running a fresh-install of Ubuntu 22.04.3 LTS.

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

### Device
Any device with an ethernet connection, and support for IPv4 DHCP can be tested.

However, to achieve a compliant test outcome, your device must be configured correctly and implement the required security features. These standards are outlined in the [Application Security Requirements for IoT Devices](https://partner-security.withgoogle.com/docs/iot_requirements). but further detail is available in [documentation for each test module](/docs/test/modules.md).

## Installation

1. Download the latest version of the Testrun installer from the [releases page](https://github.com/google/test-run/releases)

2. Open a terminal and navigate to location of the Testrun installer (most likely your downloads folder)

3. Install the package using ``sudo apt install ./testrun*.deb``

 - Testrun will be installed under the /usr/local/testrun directory.
   - Testing data will be available in the ``local/devices/{device}/reports`` folders
   - Additional configuration options are available in the ``local/system.json`` file

    **NOTE: Place your local CA certificate in local/root_certs (any name with a .crt extension) to perform TLS server tests**

## Start Testrun

1. Attach network interfaces:
   - Connect one USB Ethernet adapter to the internet source (e.g., router or switch) using an ethernet cable.
   - Connect the other USB Ethernet adapter directly to the IoT device you want to test using an ethernet cable.

   **NOTE: The device under test should be powered off until prompted**

   **NOTE: Both adapters should be disabled in the host system (IPv4, IPv6 and general). You can do this by going to Settings > Network** 

2. Start Testrun.

Start Testrun with the command `sudo testrun`

   - To run Testrun in network-only mode (without running any tests), use the `--net-only` option.

   - To run Testrun with just one interface (connected to the device), use the ``--single-intf`` option.

## Test Your Device

1. Once Testrun has started, open your browser to http://localhost:8080.

2.  Configure your network interfaces under the settings menu - located in the top right corner of the application. Settings can be changed at any time.

    ![](/docs/ui/settings_icon.png)

3. Navigate to the device repository icon to add a new device for testing.

    ![](/docs/ui/device_icon.png)

4. Click the button 'Add Device'.

5. Enter the MAC address, manufacturer name and model number.

6. Select the test modules you wish to enable for this device (Hint: All are required for qualification purposes) and click save.

7. Navigate to the Testrun progress icon and click the button 'Start New Testrun'.

    ![](/docs/ui/progress_icon.png)

8. Select the device you would like to test.

9. Enter the version number of the firmware running on the device.

10. Click 'Start Testrun'

 - During testing, if you would like to stop Testrun, click 'Stop' next to the test name.

11. Once the notification 'Waiting for Device' appears, power on the device under test.

12. On completion of the test sequence, a report will appear under the history icon. 

    ![](/docs/ui/history_icon.png)

# Troubleshooting

If you encounter any issues or need assistance, consider the following:

- Ensure that all hardware and software prerequisites are met.
- Verify that the network interfaces are connected correctly.
- Check the configuration settings.
- Refer to the Testrun documentation or ask for assistance in the issues page: https://github.com/google/testrun/issues

# Uninstall
To uninstall Testrun, use the built-in dpkg uninstall command to remove Testrun correctly. For Testrun, this would be:  ```sudo apt-get remove testrun```
