#!/bin/bash -x

# Display network interfaces
ip a

# Set interface
INTF=eth0

# Check if the interface is up
ip link show $INTF | grep "state UP" || echo "Warning: $INTF is not up"

# DHCP setup
ip addr flush dev $INTF
PID_FILE=/var/run/dhclient.pid
if [ -f $PID_FILE ]; then
    kill -9 $(cat $PID_FILE) || true
    rm -f $PID_FILE
fi
dhclient -v $INTF
DHCP_TPID=$!
echo $DHCP_TPID

# SERVICES MODULE

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

# Start SNMPv2 service 
echo "Starting SNMPv2 on ports 161/162 "
(while true; do echo -ne " \x02\x01\ " | nc -u -l -w 1 161; done) &

# Start TFTP service 
echo "Starting TFTP on port 69 "
(while true; do echo -ne "\0\x05\0\0\x07\0" | nc -u -l -w 1 69; done) &

# Start NTP service 
echo "Starting NTP service"
service ntp start

# Keep network monitoring
(while true; do arping 10.10.10.1; sleep 10; done) &
(while true; do ip a | cat; sleep 10; done) &

# Keep the script running
tail -f /dev/null
