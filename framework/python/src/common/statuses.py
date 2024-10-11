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
"""Enums for Testrun"""


class TestrunStatus:
  IDLE = "Idle"
  WAITING_FOR_DEVICE = "Waiting for Device"
  MONITORING = "Monitoring"
  IN_PROGRESS = "In Progress"
  CANCELLED = "Cancelled"
  COMPLIANT =  "Compliant"
  NON_COMPLIANT = "Non-Compliant"
  STOPPING = "Stopping"


class TestResult:
  IN_PROGRESS = "In Progress"
  COMPLIANT =  "Compliant"
  NON_COMPLIANT = "Non-Compliant"
  ERROR = "Error"
  FEATURE_NOT_DETECTED = "Feature Not Detected"
  INFORMATIONAL = "Informational"
  NOT_STARTED = "Not Started"
  DISABLED = "Disabled"
