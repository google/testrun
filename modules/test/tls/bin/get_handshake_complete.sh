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
  	