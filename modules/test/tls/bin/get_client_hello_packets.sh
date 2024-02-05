#!/bin/bash

CAPTURE_FILE=$1
SRC_IP=$2
TLS_VERSION=$3

TSHARK_OUTPUT="-T json -e ip.src -e tcp.dstport -e ip.dst"
TSHARK_FILTER="ssl.handshake.type==1 and ip.src==$SRC_IP"

if [[ $TLS_VERSION == '1.2' || -z $TLS_VERSION ]];then
	TSHARK_FILTER="$TSHARK_FILTER and ssl.handshake.version==0x0303"
elif [ $TLS_VERSION == '1.3' ];then
	TSHARK_FILTER="$TSHARK_FILTER and (ssl.handshake.version==0x0304 or tls.handshake.extensions.supported_version==0x0304)"
fi

response=$(tshark -r $CAPTURE_FILE $TSHARK_OUTPUT $TSHARK_FILTER)

echo "$response"
  	