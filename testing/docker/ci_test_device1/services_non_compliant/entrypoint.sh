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
(while true; do nc -l -p 20 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &
(while true; do nc -l -p 21 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &


# Start Telnet service 
echo "Starting Telnet on port 23"
(while true; do nc -l -p 23 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &

# Start SMTP service
echo "Starting SMTP on ports 25, 465, and 587"
(while true; do nc -l -p 25 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &
(while true; do nc -l -p 465 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &
(while true; do nc -l -p 587 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &

# Start HTTP service 
echo "Starting HTTP on port 80 "
(while true; do nc -l -p 80 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &

# Start POP service 
echo "Starting POP on ports 109 and 110 "
(while true; do nc -l -p 109 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &
(while true; do nc -l -p 110 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &

# Start IMAP service 
echo "Starting IMAP on port 143 "
(while true; do nc -l -p 143 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &

# Start IMAP service 
echo "Starting IMAP on port 143 "
(while true; do nc -l -p 123 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &

# Start SNMPv2 service 
echo "Starting SNMPv2 on ports 161/162 "
(while true; do nc -l -p 161 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &
(while true; do nc -l -p 162 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &

# Start TFTP service 
echo "Starting TFTP on port 69 "
(while true; do nc -l -p 69 < /dev/null | tee /dev/stderr | echo 'Hello TCP!' ; done) &

# Start NTP service 
echo "Starting NTP service"
service ntp start

# Keep network monitoring
(while true; do arping 10.10.10.1; sleep 10; done) &
(while true; do ip a | cat; sleep 10; done) &

# Keep the script running
tail -f /dev/null
