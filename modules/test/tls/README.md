# TLS Test Module

The TLS test module verifies that any peer or cloud connections are secure.

## What's inside?

The ```bin``` folder contains the startup script for the module.

The ```config/module_config.json``` provides the name and description of the module, and specifies which tests will be caried out.

Within the ```python/src``` directory, the below tests are executed.

## Tests covered

| ID | Description | Expected behavior | Required result
|---|---|---|---|
| security.tls.v1_2_server | Check the device web server is TLSv1.2 minimum and the certificate is valid | TLS 1.2 certificate is issues to the client when accessed | Required |
| security.tls.v1_2_client | Device uses TLS with connections to external services on any port | The packet indicates a TLS connection with at least TLS v1.2 and support for ECDH and ECDSA ciphers | Required |