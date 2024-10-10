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
"""Utility for common docker methods"""
import docker

def create_private_net(network_name):
  client = docker.from_env()
  try:
    network = client.networks.get(network_name)
    network.remove()
  except docker.errors.NotFound:
    pass

  # TODO: These should be made into variables
  ipam_pool = docker.types.IPAMPool(subnet='100.100.0.0/16',
                                    iprange='100.100.100.0/24')

  ipam_config = docker.types.IPAMConfig(pool_configs=[ipam_pool])

  client.networks.create(network_name,
                         ipam=ipam_config,
                         internal=True,
                         check_duplicate=True,
                         driver='macvlan')
