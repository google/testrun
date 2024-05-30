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
"""Stores additional information about a device's risk"""

class RiskProfile():

    def __init__(self):
        self._name = 'Unknown profile'
        self._status = 'Draft'
        self._timestamp = None
        self._version = None
        self._questions = []

    def get_name(self):
        return self._name
    
    def get_status(self):
        return self._status
    
    def get_timestamp(self):
        return self._timestamp
    
    def get_version(self):
        return self._version