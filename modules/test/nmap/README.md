# Services Test Module

The services test module checks for all running servers that are available to other devices on the network. Unsecure network services should be disabled.

## What's inside?

The ```bin``` folder contains the startup script for the module.

The ```config/module_config.json``` provides the name and description of the module, and specifies which tests will be caried out.

Within the ```python/src``` directory, the below tests are executed.

## Tests covered

| ID | Description | Expected behavior | Required result
|---|---|---|---|
| security.services.ftp | Check FTP port 20/21 is disabled and FTP is not running on any port | There is no FTP service running on any port | Required |
| security.ssh.version | If the device is running an SSH server ensure it is SSHv2 | SSH server is not running or service is SSHv2 | Required |
| security.services.telnet | Check TELNET port 23 is disabled and TELNET is not running on any port | There is no Telnet service running on any port | Required |
| security.services.smtp | Check SMTP ports 25, 465 and 587 are not enabled and SMTP is not running on any port | There is no SMTP service running on any port | Required |
| security.services.http | Check that there is no HTTP server running on any port | Device is unreachable on port 80 (or any other port) and only responds to HTTPS requests if required | Required |
| security.services.pop | Check POP ports 109 and 110 are disabled and POP is not running on any port | There is no POP service running on any port | Required |
| security.services.imap | Check IMAP port 143 is disabled and IMAP is not running on any port | There is no IMAP service running on any port | Required |
| security.services.snmpv3 | Check SNMP port 161/162 is disabled. If SNMP is an essential service, it should be v3 | Device is unreachable on port 161/162 unless SNMP is essential in which case it is SNMPv3 that is used | Required |
| security.services.vnc | Check VNS is disabled on any port | Device cannot be accessed via VNC on any port | Required |
| security.services.tftp | Check TFTP port 69 is disabled (UDP) | There is no TFTP service running on any port | Required |
| ntp.network.ntp_server | Check NTP port 123 is disabled and the device is not acting as an NTP server | The devices does not respond to NTP requests | Required |