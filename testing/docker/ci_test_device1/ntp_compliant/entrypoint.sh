#!/bin/bash -x

# Display network interfaces
ip a

# Set paths and servers
NTP_SERVER=10.10.10.5
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

# NTP MODULE
# NTP support (ntp.network.ntp_support)
ntpdate -u -t 10 -q $NTP_SERVER

# Check if the NTP request was successful
if [ $? -eq 0 ]; then
  echo "NTP request succeeded to $NTP_SERVER."
else
  echo "NTP request failed"
fi

# Obtain NTP server from DHCP and simulate NTP request (ntp.network.ntp_dhcp)
dhclient -v -sf /usr/sbin/ntpdate eth0

# Check if the DHCP server provided an NTP server and if the NTP request was successful
if grep -q "ntp-servers" /var/lib/dhcp/dhclient.leases; then
  grep "option ntp-servers" /var/lib/dhcp/dhclient.leases | awk '{print $3}' | while read ntp_server; do
    echo "NTP request sent to DHCP-provided server: $ntp_server"
    sudo ntpdate -q $NTP_SERVER
    echo "NTP request sent to DHCP-provided server: $NTP_SERVER"
    done
else
  echo "No NTP server provided by DHCP."
fi

# Keep network monitoring (can refactor later for other network modules)
(while true; do arping 10.10.10.1; sleep 10; done) &
(while true; do ip a | cat; sleep 10; done) &

# Keep the script running
tail -f /dev/null

