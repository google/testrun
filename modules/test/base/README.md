# Base Test Module

The base test module is a template image for other test modules. No actual tests are run by this module.

Other test modules utilise this module as a base image to ensure consistency between the test modules and accuracy of the inputs and outputs.

There is no requirement to re-use this module when creating your own test module, but it can speed up development.

## What's inside?

The ```bin``` folder contains multiple useful scripts that can be executed by test modules which use 'base' as a template.

The ```config/module_config.json``` provides the name and description of the module, but prevents the image from being run as a container during the testing of the device.

Within the ```python/src``` directory, basic logging and environment variables are provided to the test module.

Within the ```usr/local/etc``` directory there is a local copy of the MAC OUI database. This is just in case a new copy is unable to be downloaded during the install or update process.

## GRPC server
Within the python directory, GRPC client code is provided to allow test modules to programmatically modify the various network services provided by Testrun.

These currently include obtaining information about and controlling the DHCP servers in failover configuration.

## Tests covered

No tests are run by this module