<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png" alt="Testrun">

## Adding a New Network Service

The Testrun framework allows users to add their own network services with ease. A template network service can be used to get started quickly, this can be found at [modules/network/template](../../modules/network/template). Otherwise, see below for details of the requirements for new network services.

To add a new network service to Testrun, follow the procedure below:

1. Create a folder under `modules/network/` with the name of the network service in lowercase, using only alphanumeric characters and hyphens (`-`).
2. Inside the created folder, include the following files and folders:
   - `{module}.Dockerfile`: Dockerfile for building the network service image. Replace `{module}` with the name of the module.
   - `conf/`: Folder containing the module configuration files.
   - `bin/`: Folder containing the startup script for the network service.
   - Any additional application code can be placed in its own folder.

### Example `module_config.json`

```json
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

### Example of {module}.Dockerfile

```Dockerfile
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

# Do not specify a CMD or Entrypoint as Testrun will automatically start your service as required
```

### Example of start_network_service script

```bash
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




