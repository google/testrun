# Device Configuration

The device configuration file allows you to customize the testing behavior for a specific device. This file is located at `local/devices/{Device Name}/device_config.json`. Below is an overview of how to configure the device tests.

## Device Information

The device information section includes the manufacturer, model, and MAC address of the device. These details help identify the specific device being tested.

## Test Modules

Test modules are groups of tests that can be enabled or disabled as needed. You can choose which test modules to run on your device.

### Enabling and Disabling Test Modules

To enable or disable a test module, modify the `enabled` field within the respective module. Setting it to `true` enables the module, while setting it to `false` disables the module.

## Customizing the Device Configuration

To customize the device configuration for your specific device, follow these steps:

1. Copy the default configuration file provided in the `resources/devices/template` folder.
   - Create a new folder for your device under `local/devices` directory.
   - Copy the `device_config.json` file from `resources/devices/template` to the newly created device folder.

This ensures that you have a copy of the default configuration file, which you can then modify for your specific device.

> Note: Ensure that the device configuration file is properly formatted, and the changes made align with the intended test behavior. Incorrect settings or syntax may lead to unexpected results during testing.

If you encounter any issues or need assistance with the device configuration, refer to the Testrun documentation or ask a question on the Issues page.
