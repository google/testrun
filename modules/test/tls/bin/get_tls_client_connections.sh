#!/bin/bash

CAPTURE_FILE=$1
SRC_IP=$2

TSHARK_OUTPUT="-T json -e ip.src -e tcp.dstport -e ip.dst"
TSHARK_FILTER="ip.src == $SRC_IP and tls"

response=$(tshark -r $CAPTURE_FILE $TSHARK_OUTPUT $TSHARK_FILTER)

echo "$response"
  	