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

TSHARK_OUTPUT="-T json -e ip.src -e tcp.dstport -e ip.dst"
# Filter out TLS, DNS and NTP, ICMP (ping), braodcast and multicast packets
# - NTP and DNS traffic is not encrypted and if invalid NTP and/or DNS traffic has been detected
#   this will be handled by their respective test modules.
# - Multicast and braodcast protocols are not typically encrypted so we aren't expecting them to
#   be over TLS connections
# - ICMP (ping) requests are not encrypted so we also need to ignore these
TSHARK_FILTER="ip.src == $SRC_IP and not tls and not dns and not ntp and not icmp and not(ip.dst == 224.0.0.0/4 or ip.dst == 255.255.255.255)"

response=$(tshark -r "$CAPTURE_FILE" $TSHARK_OUTPUT $TSHARK_FILTER)

echo "$response"
  	