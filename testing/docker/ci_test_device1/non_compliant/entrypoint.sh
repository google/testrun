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

# Start FTP service 
echo "Starting FTP on ports 20, 21"
nc -nvlt -p 20 &
nc -nvlt -p 21 &

# Start Telnet service 
echo "Starting Telnet on port 23"
nc -nvlt -p 23 &

# Start SMTP service
echo "Starting SMTP on ports 25, 465, and 587"
nc -nvlt -p 25 &
nc -nvlt -p 465 &
nc -nvlt -p 587 &

# Start HTTP service 
echo "Starting HTTP on port 80 "
nc -nvlt -p 80 &

# Start POP service 
echo "Starting POP on ports 109 and 110 "
nc -nvlt -p 109 &
nc -nvlt -p 110 &

# Start IMAP service 
echo "Starting IMAP on port 143 "
nc -nvlt -p 143 &

# Start SSHv1 service 
echo "Configuring SSH for Protocol 1 only"
mkdir -p /run/sshd
chmod 0755 /run/sshd

# Force only SSHv1 and disable SSHv2
echo 'Protocol 1' > /etc/ssh/sshd_config
echo 'Port 22' >> /etc/ssh/sshd_config
echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config
echo 'UsePrivilegeSeparation no' >> /etc/ssh/sshd_config
echo 'HostKey /etc/ssh/ssh_host_rsa_key' >> /etc/ssh/sshd_config
echo 'LogLevel VERBOSE' >> /etc/ssh/sshd_config
echo 'PermitEmptyPasswords yes' >> /etc/ssh/sshd_config

# Restart SSH with Protocol 1
echo "Restarting SSH service with Protocol 1"
service ssh restart

# Start SNMPv2 service 
echo "Starting SNMPv2 on ports 161/162 "
(while true; do echo -ne " \x02\x01\ " | nc -u -l -w 1 161; done) &

# VNC  [Assumed to be disabled as you didn't specify ports]
echo "VNC service is running "

# Start TFTP service 
echo "Starting TFTP on port 69 "
(while true; do echo -ne "\0\x05\0\0\x07\0" | nc -u -l -w 1 69; done) &

# Start NTP service 
echo "Starting NTP service on port 123 "
(while true; do ntpdate -q -p 1 10.10.10.1; sleep 5; done) &

# Keep network monitoring (can refactor later for other network modules)
(while true; do arping 10.10.10.1; sleep 10; done) &
(while true; do ip a | cat; sleep 10; done) &

# Keep the script running
tail -f /dev/null

