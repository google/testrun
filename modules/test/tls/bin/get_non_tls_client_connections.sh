#!/bin/bash

CAPTURE_FILE=$1
SRC_IP=$2

TSHARK_OUTPUT="-T json -e ip.src -e tcp.dstport -e ip.dst"
# Filter out TLS, DNS and NTP, ICMP (ping), braodcast and multicast packets
# - NTP and DNS traffic is not encrypted and if invalid NTP and/or DNS traffic has been detected
#   this will be handled by their respective test modules.
# - Multicast and braodcast protocols are not typically encrypted so we aren't expecting them to
#   be over TLS connections
# - ICMP (ping) requests are not encrypted so we also need to ignore these
TSHARK_FILTER="ip.src == $SRC_IP and not tls and not dns and not ntp and not icmp and not(ip.dst == 224.0.0.0/4 or ip.dst == 255.255.255.255)"

response=$(tshark -r $CAPTURE_FILE $TSHARK_OUTPUT $TSHARK_FILTER)

echo "$response"
  	