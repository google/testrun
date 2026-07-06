#!/bin/bash

# Copyright 2026 Google LLC
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

TSHARK_FILTER="bacnet && ip.src == $SRC_IP"
TSHARK_OUTPUT="-T json -e ip.src -e ip.dst -e eth.src -e eth.dst -e bacapp.instance_number -e _ws.col.Info"

response=$(tshark -r "$CAPTURE_FILE" $TSHARK_OUTPUT -Y "$TSHARK_FILTER")

echo "$response"