# Additional Configuration Options

Some configuration options are available but not exposed through the user interface and requires direct access. 
Modification of various configuration files is necessary to access these options.

## Override test module timeout at the system level 

Testrun attempts to set reasonable timeouts for test modules to prevent overly long test times but sometimes 
a device or series of device may require longer than these default values.  These can be overridden at 
the test module configuration level but is not preferred since these changes will be undone during every 
version upgrade. To modify these values:

1. Navigate to the testrun installation directory. By default, this will be at:
    `/usr/local/testrun`

2. Open the system.json file and add the following section:
    `"test_modules":{}`

3. Add the module name(s) and timeout property into this test_modules section you wish to
set the timeout property for:
    ```
    "test_modules":{
      "connection":{
        "timeout": 500
      }
    }
    ```

Before timeout options:
```
{
  "network": {
    "device_intf": "ens0",
    "internet_intf": "ens1"
  },
  "log_level": "DEBUG",
  "startup_timeout": 60,
  "monitor_period": 60,
  "max_device_reports": 5,
  "org_name": "",
  "single_intf": false
  }
```

After timeout options:
```
{
  "network": {
    "device_intf": "ens0",
    "internet_intf": "ens1"
  },
  "log_level": "DEBUG",
  "startup_timeout": 60,
  "monitor_period": 60,
  "max_device_reports": 5,
  "org_name": "",
  "single_intf": false,
  "test_modules":{
    "connection":{
      "timeout": 500
    }
  }
}
```

## Override test module log level at the system level 

Test modules default to the log level info to prevent unecessary logging. These can be overridden at the test module configuration level but is not preferred since these changes will be undone during every version upgrade. To modify these values:

1. Navigate to the testrun installation directory. By default, this will be at:
    `/usr/local/testrun`

2. Open the system.json file and add the following section:
    `"test_modules":{}`

3. Add the module name(s) and log_level property into this test_modules section you wish to
set the log_level property for:
    ```
    "test_modules":{
        "connection":{
          "log_level": "DEBUG"
        }
      }
      ```
Valid options for modifying the log level are: INFO, DEBUG, WARNING, ERROR.

Before log_level options:
```
{
  "network": {
    "device_intf": "ens0",
    "internet_intf": "ens1"
  },
  "log_level": "DEBUG",
  "startup_timeout": 60,
  "monitor_period": 60,
  "max_device_reports": 5,
  "org_name": "",
  "single_intf": false
  }
```

After log_level options:
```
{
  "network": {
    "device_intf": "ens0",
    "internet_intf": "ens1"
  },
  "log_level": "DEBUG",
  "startup_timeout": 60,
  "monitor_period": 60,
  "max_device_reports": 5,
  "org_name": "",
  "single_intf": false,
  "test_modules":{
    "connection":{
      "log_level": "DEBUG"
    }
  }
```