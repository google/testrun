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
"""Contains all the necessary methods to create and monitor DHCP
leases on the server"""
from datetime import datetime
import time

time_format = '%Y-%m-%d %H:%M:%S'


class DHCPLease(object):
  """Represents a DHCP Server lease"""
  hw_addr = None
  ip = None
  hostname = None
  expires = None

  def __init__(self, lease):
    self._make_lease(lease)

  def _make_lease(self, lease):
    if lease is not None:
      sections_raw = lease.split(' ')
      sections = []
      for section in sections_raw:
        if section.strip():
          sections.append(section)
      self.hw_addr = sections[0]
      self.ip = sections[1]
      self.hostname = sections[2]
      self.expires = sections[3] + ' ' + sections[4]
      self.manufacturer = ' '.join(sections[5:])

  def get_millis(self, timestamp):
    dt_obj = datetime.strptime(timestamp, time_format)
    millis = dt_obj.timestamp() * 1000
    return millis

  def get_expires_millis(self):
    return self.get_millis(self.expires)

  def is_expired(self):
    expires_millis = self.get_expires_millis()
    cur_time = int(round(time.time()) * 1000)
    return cur_time >= expires_millis

  def __str__(self):
    lease = {}
    if self.hw_addr is not None:
      lease['hw_addr'] = self.hw_addr

    if self.ip is not None:
      lease['ip'] = self.ip

    if self.hostname is not None:
      lease['hostname'] = self.hostname

    if self.expires is not None:
      lease['expires'] = self.expires

    if self.manufacturer is not None:
      lease['manufacturer'] = self.manufacturer

    return str(lease)
