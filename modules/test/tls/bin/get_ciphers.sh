#!/bin/bash

CAPTURE_FILE=$1
DST_IP=$2
DST_PORT=$3

TSHARK_FILTER="ssl.handshake.ciphersuites and ip.dst==$DST_IP and tcp.dstport==$DST_PORT"
response=$(tshark -r $CAPTURE_FILE -Y "$TSHARK_FILTER" -Vx | grep 'Cipher Suite:' | awk '{$1=$1};1' | sed 's/Cipher Suite: //')

echo "$response"
