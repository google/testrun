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


CAPTURE_FILE="$1"
SRC_IP="$2"
TLS_VERSION="$3"

TSHARK_OUTPUT="-T json -e ip.src -e tcp.dstport -e ip.dst"
# Handshakes will still report TLS version 1 even for TLS 1.2 connections
# so we need to filter thes out
TSHARK_FILTER="ip.src==$SRC_IP and ssl.handshake.type!=1"

if [ $TLS_VERSION == '1.0' ];then
	TSHARK_FILTER="$TSHARK_FILTER and ssl.record.version==0x0301"
elif [ $TLS_VERSION == '1.1' ];then
	TSHARK_FILTER="$TSHARK_FILTER and ssl.record.version==0x0302"
elif [ $TLS_VERSION == '1.2' ];then
	TSHARK_FILTER="$TSHARK_FILTER and ssl.record.version==0x0303"
elif [ $TLS_VERSION == '1.3' ];then
	TSHARK_FILTER="$TSHARK_FILTER and ssl.record.version==0x0304"
fi

response=$(tshark -r "$CAPTURE_FILE" $TSHARK_OUTPUT $TSHARK_FILTER)

echo "$response"
  	