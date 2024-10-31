# TLS Test Module

The TLS test module verifies that any peer or cloud connections are secure.

## What's inside?

The ```bin``` folder contains the startup script for the module.

The ```config/module_config.json``` provides the name and description of the module, and specifies which tests will be caried out.

Within the ```python/src``` directory, the below tests are executed.

## Tests covered

| ID | Description | Expected behavior | Required result
|---|---|---|---|

| security.tls.v1_0_client | Device uses TLS with connection to an external service on port 443 (or any other port which could be running the webserver-HTTPS) | The packet indicates a TLS connection with at least TLS 1.0 and support | Informational |

| security.tls.v1_2_server | Check the device web server TLS 1.2 and the certificate is valid | TLS 1.2 certificate is issues to the web browser client when accessed | Required if Applicable |

| security.tls.v1_2_client | Device uses TLS with connection to an external service on port 443 (or any other port which could be running the webserver-HTTPS) | The packet indicates a TLS connection with at least TLS v1.2 and support for ECDH and ECDSA ciphers | Required if Applicable |

| security.tls.v1_3_server | Check the device web server TLS 1.3 and the certificate is valid | TLS 1.3 certificate is issued to the web browser client when accessed | Informational |

| security.tls.v1_3_client | Device uses TLS with connection to an external service on port 443 (or any other port which could be running the webserver-HTTPS) | The packet indicates a TLS connection with at least TLS 1.3 | Informational |

