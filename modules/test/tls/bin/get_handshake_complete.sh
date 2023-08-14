#!/bin/bash

CAPTURE_FILE=$1
SRC_IP=$2
DST_IP=$3
TLS_VERSION=$4

TSHARK_FILTER="ip.src==$SRC_IP and ip.dst==$DST_IP "

if [[ $TLS_VERSION == '1.2' || -z $TLS_VERSION ]];then
	TSHARK_FILTER=$TSHARK_FILTER " and ssl.handshake.type==2 and tls.handshake.type==14 "
elif [ $TLS_VERSION == '1.2' ];then
	TSHARK_FILTER=$TSHARK_FILTER "and ssl.handshake.type==2 and tls.handshake.extensions.supported_version==0x0304"
fi

response=$(tshark -r $CAPTURE_FILE $TSHARK_FILTER)

echo "$response"
  	