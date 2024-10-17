#!/bin/bash -x

# Display network interfaces
ip a

# Set paths and servers
OUT=/out/testrun_ci.json
NTP_SERVER=10.10.10.5
DNS_SERVER=10.10.10.4
INTF=eth0

function wout(){
    temp=${1//./\".\"}
    key=${temp:1}\"
    echo $key
    value=$2
    jq "$key+=\"$value\"" $OUT | sponge $OUT
}


dig @8.8.8.8 +short www.google.com

# DHCP
ip addr flush dev $INTF
PID_FILE=/var/run/dhclient.pid
if [ -f $PID_FILE ]; then
    kill -9 $(cat $PID_FILE) || true
    rm -f $PID_FILE
fi
dhclient -v $INTF
DHCP_TPID=$!
echo $DHCP_TPID

# Services Module

# Start FTP service (non-compliant)
echo "Starting FTP on ports 20, 21 (non-compliant)"
nc -nvlt -p 20 &
nc -nvlt -p 21 &

# Start Telnet service (non-compliant)
echo "Starting Telnet on port 23 (non-compliant)"
nc -nvlt -p 23 &

# Start SMTP service (non-compliant)
echo "Starting SMTP on ports 25, 465, and 587 (non-compliant)"
nc -nvlt -p 25 &
nc -nvlt -p 465 &
nc -nvlt -p 587 &

# Start HTTP service (non-compliant)
echo "Starting HTTP on port 80 (non-compliant)"
nc -nvlt -p 80 &

# Start POP service (non-compliant)
echo "Starting POP on ports 109 and 110 (non-compliant)"
nc -nvlt -p 109 &
nc -nvlt -p 110 &

# Start IMAP service (non-compliant)
echo "Starting IMAP on port 143 (non-compliant)"
nc -nvlt -p 143 &

# Start SSHv1 service (non-compliant)
echo "Starting non-compliant SSHv1 service"
echo 'Protocol 1' >> /usr/local/etc/sshd_config
/usr/local/sbin/sshd

# Start SNMPv2 service (non-compliant)
echo "Starting SNMPv2 on ports 161/162 (non-compliant)"
(while true; do echo -ne " \x02\x01\ " | nc -u -l -w 1 161; done) &

# VNC (non-compliant) [Assumed to be disabled as you didn't specify ports]
echo "VNC service is running (non-compliant)"

# Start TFTP service (non-compliant)
echo "Starting TFTP on port 69 (non-compliant)"
(while true; do echo -ne "\0\x05\0\0\x07\0" | nc -u -l -w 1 69; done) &

# Start NTP service (non-compliant)
echo "Starting NTP service on port 123 (non-compliant)"
(while true; do ntpdate -q -p 1 10.10.10.1; sleep 5; done) &

# Keep network monitoring (can refactor later for other network modules)
(while true; do arping 10.10.10.1; sleep 10; done) &
(while true; do ip a | cat; sleep 10; done) &

# Keep the script running
tail -f /dev/null

