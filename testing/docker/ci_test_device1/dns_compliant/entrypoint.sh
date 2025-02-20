#!/bin/bash -x

# Display network interfaces
ip a

# Set paths and servers
DNS_SERVER=8.8.8.8
INTF=eth0

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

# DNS MODULE

# Test DNS resolution
echo "Sending DNS request to $DNS_SERVER"
dig @$DNS_SERVER +short www.google.com

# Keep network monitoring (can refactor later for other network modules)
(while true; do arping 10.10.10.1; sleep 10; done) &
(while true; do ip a | cat; sleep 10; done) &

# Keep the script running
tail -f /dev/null

