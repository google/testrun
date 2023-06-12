#!/bin/bash

# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

OUT=/out/testrun_ci.json

NTP_SERVER=10.10.10.5
DNS_SERVER=10.10.10.4

function wout(){
    temp=${1//./\".\"}
    key=${temp:1}\"
    echo $key
    value=$2
    jq "$key+=\"$value\"" $OUT | sponge $OUT
}


dig @8.8.8.8 +short www.google.com

# DHCP
ip addr flush dev eth0
PID_FILE=/var/run/dhclient.pid
if [ -f $PID_FILE ]; then
    kill -9 $(cat $PID_FILE) || true
    rm -f $PID_FILE
fi
dhclient -v eth0

echo "{}" > $OUT

# Gen network
main_intf=$(ip route | grep '^default' | awk '{print $NF}')

wout .network.main_intf $main_intf 
wout .network.gateway $(ip route | head -n 1 | awk '{print $3}')
wout .network.ipv4 $(ip a show $main_intf | grep "inet " | awk '{print $2}')
wout .network.ipv6 $(ip a show $main_intf | grep inet6 | awk '{print $2}')
wout .network.ethmac $(cat /sys/class/net/$main_intf/address)

wout .dns_response $(dig @$DNS_SERVER +short www.google.com | tail -1)
wout .ntp_offset $(ntpdate -q $NTP_SERVER | tail -1 | sed -E 's/.*offset ([-=0-9\.]*) sec/\1/')

# INTERNET CONNECTION
google_com_response=$(curl -LI http://www.google.com -o /dev/null -w '%{http_code}\n' -s)
wout .network.internet $google_com_response

# DHCP LEASE
while read pre name value; do
    if [[ $pre != option ]]; then
        continue;
    fi

    wout .dhcp.$name $(echo "${value%;}" | tr -d '\"\\')
 
done < <(grep -B 99 -m 1 "}" /var/lib/dhcp/dhclient.leases)

cat $OUT