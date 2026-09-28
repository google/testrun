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
    kill -9 "$(cat "$PID_FILE")" || true
    rm -f $PID_FILE
fi
dhclient -v $INTF
DHCP_TPID=$!
echo $DHCP_TPID

# NTP MODULE
# Obtain NTP server from DHCP lease if available
if grep -q "ntp-servers" /var/lib/dhcp/dhclient.leases; then
  dhcp_ntp_server=$(grep "option ntp-servers" /var/lib/dhcp/dhclient.leases | tail -1 | awk '{print $3}' | tr -d ';')
  if [ -n "$dhcp_ntp_server" ]; then
    NTP_SERVER="$dhcp_ntp_server"
    echo "NTP server provided by DHCP: $NTP_SERVER"
  fi
else
  echo "No NTP server provided by DHCP, using default: $NTP_SERVER"
fi

# Send initial NTP request (ntp.network.ntp_support & ntp.network.ntp_dhcp)
ntpdate -u -t 10 -q "$NTP_SERVER"

# Check if the NTP request was successful
if [ $? -eq 0 ]; then
  echo "NTP request succeeded to $NTP_SERVER."
else
  echo "NTP request failed"
fi

# Keep network monitoring and NTP requests running
(while true; do ntpdate -u -q "$NTP_SERVER"; sleep 5; done) &
(while true; do arping 10.10.10.1; sleep 10; done) &
(while true; do ip a | cat; sleep 10; done) &

# Keep the script running
tail -f /dev/null

