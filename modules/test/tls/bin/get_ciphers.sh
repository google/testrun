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
DST_IP="$2"
DST_PORT="$3"

TSHARK_FILTER="ssl.handshake.ciphersuites and ip.dst==$DST_IP and tcp.dstport==$DST_PORT"
response=$(tshark -r "$CAPTURE_FILE" -Y "$TSHARK_FILTER" -Vx | grep 'Cipher Suite:' | awk '{$1=$1};1' | sed 's/Cipher Suite: //')

echo "$response"
