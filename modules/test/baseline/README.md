# Baseline Test Module

The baseline test module runs a test for each result status type. This is used for testing purposes - to ensure that the test framework is operational.

This module is disabled by default when testing a physical device and there is no need for this to be enabled.

## What's inside?

The ```bin``` folder contains the startup script for the module.

The ```config/module_config.json``` provides the name and description of the module, and specifies which tests will be caried out.

Within the ```python/src``` directory, the below tests are executed.

## Tests covered

| ID | Description | Expected behavior | Required result
|---|---|---|---|
| baseline.compliant | Simulate a compliant test | A compliant test result is generated | Required |
| baseline.informational | Simulate an informational test | An informational test result is generated | Informational |
| baseline.non-compliant | Simulate a non-compliant test | A non-compliant test result is generated | Required |