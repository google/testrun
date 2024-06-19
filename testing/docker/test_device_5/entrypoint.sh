#!/bin/bash -x

ip a


OUT=/out/testrun_ci.json

NTP_SERVER=10.10.10.5
DNS_SERVER=10.10.10.4
INTF=eth0
non_comp = true

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



dhclient -v $INTF





# Keep test device running
tail -f /dev/null
