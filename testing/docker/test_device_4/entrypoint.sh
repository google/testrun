#!/bin/bash -x

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


# Sets where the NTP packets are sent from
ip addr add 10.10.10.14/24 dev $INTF

# Simulates NTP
(while true; do
    echo "Sending NTPv4 request to $NTP_SERVER"
    ntpd -q -g $NTP_SERVER
    sleep 5
done) &

dhclient -v $INTF
ip a


# Simulate DNS
(while true; do
    echo "Sending DNS request to $DNS_SERVER"
    dig @$DNS_SERVER +short google.com
    sleep 5
done) &


# Keep test device running
tail -f /dev/null