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

# Query the NTP server provided by DHCP option 42 (ntp.network.ntp_dhcp)
if grep -q "ntp-servers" /var/lib/dhcp/dhclient.leases; then
  grep "option ntp-servers" /var/lib/dhcp/dhclient.leases | awk '{print $3}' | tr -d ';' | while read ntp_server; do
    ntpdate -u -t 2 -q "$ntp_server"
    echo "NTP request sent to DHCP-provided server: $ntp_server"
    done
else
  echo "No NTP server provided by DHCP."
fi

# Keep sending NTP requests so they are captured during the monitor period
(while true; do ntpdate -u -t 2 -q $NTP_SERVER; sleep 5; done) &

# Keep network monitoring (can refactor later for other network modules)
(while true; do arping 10.10.10.1; sleep 10; done) &
(while true; do ip a | cat; sleep 10; done) &

# Keep the script running
tail -f /dev/null

