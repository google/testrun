<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

# Add a new network service

The Testrun framework allows you to easily add your own network services. You can use the template network service at [modules/network/template](/modules/network/template). To add a new network service, follow these steps: 

1. Create a folder under `modules/network/` with the name of the network service in lowercase using only alphanumeric characters and hyphens (-).
1. Include the following items in the created folder:
    -  `{module}.Dockerfile`: Dockerfile builds the network service image. Replace `{module}` with the name of the module.
    -  `conf/`: Folder containing the module configuration files.
    -  `bin/`: Folder containing the start-up script for the network service.
    -  Place any additional application code in its own folder.

Here are some examples:

## {module}.Dockerfile

```
# Image name: test-run/{module}
FROM test-run/base:latest

ARG MODULE_NAME={module}
ARG MODULE_DIR=modules/network/$MODULE_NAME

# Install network service dependencies
# ...

# Copy over all configuration files
COPY $MODULE_DIR/conf /testrun/conf

# Copy over all binary files
COPY $MODULE_DIR/bin /testrun/bin

# Copy over all python files
COPY $MODULE_DIR/python /testrun/python

# Do not specify a CMD or Entrypoint as Testrun will automatically start your service as required by calling the start_network_service script in the bin folder
```

## module_config.json
```
{
  "config": {
    "meta": {
      "name": "{module}",
      "display_name": "Network Service Name",
      "description": "Description of the network service"
    },
    "network": {
      "interface": "veth0",
      "enable_wan": false,
      "ip_index": 2
    },
    "grpc": {
      "port": 5001
    },
    "docker": {
      "depends_on": "base",
      "mounts": [
        {
          "source": "runtime/network",
          "target": "/runtime/network"
        }
      ]
    }
  }
}

```

## start_network_service script
```
#!/bin/bash

CONFIG_FILE=/etc/network_service/config.conf
# ...

echo "Starting Network Service..."

# Perform any required setup steps
# ...

# Start the network service
# ...

# Monitor for changes in the config file
# ...

# Restart the network service when the config changes
# ...
```