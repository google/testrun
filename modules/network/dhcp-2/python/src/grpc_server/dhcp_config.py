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
"""Contains all the necessary classes to maintain the 
DHCP server's configuration"""
import re
from common import logger

LOG_NAME = 'dhcp_config'
LOGGER = None

CONFIG_FILE = '/etc/dhcp/dhcpd.conf'

DEFAULT_LEASE_TIME_KEY = 'default-lease-time'
MAX_LEASE_TIME_KEY = 'max-lease-time'


class DHCPConfig:
  """Represents the DHCP Servers configuration and gives access to modify it"""

  def __init__(self):
    self._default_lease_time = 30
    self._max_lease_time = 30
    self._subnets = []
    self._peer = None
    self._reserved_hosts = []
    global LOGGER
    LOGGER = logger.get_logger(LOG_NAME, 'dhcp-2')

  def add_reserved_host(self, hostname, hw_addr, ip_addr):
    host = DHCPReservedHost(hostname=hostname,
                            hw_addr=hw_addr,
                            fixed_addr=ip_addr)
    self._reserved_hosts.append(host)

  def delete_reserved_host(self, hw_addr):
    for host in self._reserved_hosts:
      if hw_addr == host.hw_addr:
        self._reserved_hosts.remove(host)

  def disable_failover(self):
    self._peer.disable()
    for subnet in self._subnets:
      subnet.disable_peer()

  def enable_failover(self):
    self._peer.enable()
    for subnet in self._subnets:
      subnet.enable_peer()

  def get_peer(self):
    return self._peer

  def get_subnets(self):
    return self._subnets

  def get_reserved_host(self, hw_addr):
    for host in self._reserved_hosts:
      if hw_addr == host.hw_addr:
        return host

  def write_config(self, config=None):
    if config is None:
      conf = str(self)
      with open(CONFIG_FILE, 'w', encoding='UTF-8') as conf_file:
        conf_file.write(conf)
    else:
      with open(CONFIG_FILE, 'w', encoding='UTF-8') as conf_file:
        conf_file.write(config)

  def _get_config(self, config_file=CONFIG_FILE):
    content = None
    with open(config_file, 'r', encoding='UTF-8') as f:
      content = f.read()
    return content

  def make(self, conf):
    try:
      self._subnets = self.resolve_subnets(conf)
      self._peer = DHCPFailoverPeer(conf)
      self._reserved_hosts = self.resolve_reserved_hosts(conf)
    except Exception as e:  # pylint: disable=W0718
      print('Failed to make DHCPConfig: ' + str(e))

  def resolve_config(self, config_file=CONFIG_FILE):
    try:
      conf = self._get_config(config_file)
      self._subnets = self.resolve_subnets(conf)
      self._peer = DHCPFailoverPeer(conf)
      self._reserved_hosts = self.resolve_reserved_hosts(conf)
    except Exception as e:  # pylint: disable=W0718
      print('Failed to resolve config: ' + str(e))

  def resolve_subnets(self, conf):
    subnets = []
    regex = r'(subnet.*)'
    subnets_conf = re.findall(regex, conf, re.MULTILINE | re.DOTALL)
    for subnet in subnets_conf:
      dhcp_subnet = DHCPSubnet(subnet)
      subnets.append(dhcp_subnet)
    return subnets

  def resolve_reserved_hosts(self, conf):
    hosts = []
    host_start = 0
    while True:
      host_start = conf.find('host', host_start)
      if host_start < 0:
        break
      else:
        host_end = conf.find('}', host_start)
      host = DHCPReservedHost(config=conf[host_start:host_end + 1])
      hosts.append(host)
      host_start = host_end + 1
    return hosts

  def set_range(self, start, end, subnet=0, pool=0):
    # Calculate the subnet from the range
    octets = start.split('.')
    octets[-1] = '0'
    dhcp_subnet = '.'.join(octets)

    # Calcualte the netmask from the range
    prefix = self.calculate_prefix_length(start, end)
    netmask = self.calculate_netmask(prefix)

    #Update the subnet, range and netmask
    self._subnets[subnet].set_subnet(dhcp_subnet, netmask)
    self._subnets[subnet].pools[pool].set_range(start, end)

  def calculate_prefix_length(self, start_ip, end_ip):
    start_octets = start_ip.split('.')
    end_octets = end_ip.split('.')

    start_int = int(
        ''.join(format(int(octet), '08b') for octet in start_octets), 2)
    end_int = int(''.join(format(int(octet), '08b') for octet in end_octets), 2)

    xor_result = start_int ^ end_int
    prefix_length = 32 - xor_result.bit_length()

    return prefix_length

  def calculate_netmask(self, prefix_length):
    num_network_bits = prefix_length
    num_host_bits = 32 - num_network_bits

    netmask_int = (2**num_network_bits - 1) << num_host_bits
    netmask_octets = [(netmask_int >> (i * 8)) & 0xff for i in range(3, -1, -1)]

    return '.'.join(str(octet) for octet in netmask_octets)

  def __str__(self):

    config = ('{DEFAULT_LEASE_TIME_KEY} {DEFAULT_LEASE_TIME};'
              if self._default_lease_time is not None else '')
    config += ('\n\r{MAX_LEASE_TIME_KEY} {MAX_LEASE_TIME};'
               if self._max_lease_time is not None else '')

    # Encode the top level config options
    #config = """{DEFAULT_LEASE_TIME_KEY} {DEFAULT_LEASE_TIME};"""
    config = config.format(length='multi-line',
                           DEFAULT_LEASE_TIME_KEY=DEFAULT_LEASE_TIME_KEY,
                           DEFAULT_LEASE_TIME=self._default_lease_time,
                           MAX_LEASE_TIME_KEY=MAX_LEASE_TIME_KEY,
                           MAX_LEASE_TIME=self._max_lease_time)

    # Encode the failover peer
    config += '\n\n' + str(self._peer)

    # Encode the subnets
    for subnet in self._subnets:
      config += '\n\n' + str(subnet)

    # Encode the reserved hosts
    for host in self._reserved_hosts:
      config += '\n' + str(host)

    return str(config)


FAILOVER_PEER_KEY = 'failover peer'
PRIMARY_KEY = 'primary'
ADDRESS_KEY = 'address'
PORT_KEY = 'port'
PEER_ADDRESS_KEY = 'peer address'
PEER_PORT_KEY = 'peer port'
MAX_RESPONSE_DELAY_KEY = 'max-response-delay'
MAX_UNACKED_UPDATES_KEY = 'max-unacked-updates'
MCLT_KEY = 'mclt'
SPLIT_KEY = 'split'
LOAD_BALANCE_MAX_SECONDS_KEY = 'load balance max seconds'


class DHCPFailoverPeer:
  """Contains all information to define the DHCP failover peer"""

  def __init__(self, config):
    self.name = None
    self.primary = False
    self.address = None
    self.port = None
    self.peer_address = None
    self.peer_port = None
    self.max_response_delay = None
    self.max_unacked_updates = None
    self.mclt = None
    self.split = None
    self.load_balance_max_seconds = None
    self.peer = None
    self.enabled = True

    self.resolve_peer(config)

  def __str__(self):
    config = '{FAILOVER_PEER_KEY} \"{FAILOVER_PEER}\" {{\n'
    config += '\tprimary;' if self.primary else 'secondary;'
    config += '\n\t{ADDRESS_KEY} {ADDRESS};' if self.address is not None else ''
    config += '\n\t{PORT_KEY} {PORT};' if self.port is not None else ''
    config += ('\n\t{PEER_ADDRESS_KEY} {PEER_ADDRESS};'
               if self.peer_address is not None else '')
    config += ('\n\t{PEER_PORT_KEY} {PEER_PORT};'
               if self.peer_port is not None else '')
    config += ('\n\t{MAX_RESPONSE_DELAY_KEY} {MAX_RESPONSE_DELAY};'
               if self.max_response_delay is not None else '')
    config += ('\n\t{MAX_UNACKED_UPDATES_KEY} {MAX_UNACKED_UPDATES};'
               if self.max_unacked_updates is not None else '')
    config += '\n\t{MCLT_KEY} {MCLT};' if self.mclt is not None else ''
    config += '\n\t{SPLIT_KEY} {SPLIT};' if self.split is not None else ''
    config += ('\n\t{LOAD_BALANCE_MAX_SECONDS_KEY} {LOAD_BALANCE_MAX_SECONDS};'
               if self.load_balance_max_seconds is not None else '')
    config += '\n\r}}'

    config = config.format(
        length='multi-line',
        FAILOVER_PEER_KEY=FAILOVER_PEER_KEY,
        FAILOVER_PEER=self.name,
        ADDRESS_KEY=ADDRESS_KEY,
        ADDRESS=self.address,
        PORT_KEY=PORT_KEY,
        PORT=self.port,
        PEER_ADDRESS_KEY=PEER_ADDRESS_KEY,
        PEER_ADDRESS=self.peer_address,
        PEER_PORT_KEY=PEER_PORT_KEY,
        PEER_PORT=self.peer_port,
        MAX_RESPONSE_DELAY_KEY=MAX_RESPONSE_DELAY_KEY,
        MAX_RESPONSE_DELAY=self.max_response_delay,
        MAX_UNACKED_UPDATES_KEY=MAX_UNACKED_UPDATES_KEY,
        MAX_UNACKED_UPDATES=self.max_unacked_updates,
        MCLT_KEY=MCLT_KEY,
        MCLT=self.mclt,
        SPLIT_KEY=SPLIT_KEY,
        SPLIT=self.split,
        LOAD_BALANCE_MAX_SECONDS_KEY=LOAD_BALANCE_MAX_SECONDS_KEY,
        LOAD_BALANCE_MAX_SECONDS=self.load_balance_max_seconds)

    if not self.enabled:
      lines = config.strip().split('\n')
      for i in range(len(lines) - 1):
        lines[i] = '#' + lines[i]
      lines[-1] = '#' + lines[-1].strip()  # Handle the last line separately
      config = '\n'.join(lines)

    return config

  def disable(self):
    self.enabled = False

  def enable(self):
    self.enabled = True

  def resolve_peer(self, conf):
    peer = ''
    lines = conf.split('\n')
    for line in lines:
      if line.startswith(FAILOVER_PEER_KEY) or len(peer) > 0:
        if len(peer) <= 0:
          self.name = line.strip().split(FAILOVER_PEER_KEY)[1].strip().split(
              '{')[0].split('\"')[1]
        peer += line + '\n'
        if PRIMARY_KEY in line:
          self.primary = True
        elif ADDRESS_KEY in line and PEER_ADDRESS_KEY not in line:
          self.address = line.strip().split(ADDRESS_KEY)[1].strip().split(
              ';')[0]
        elif PORT_KEY in line and PEER_PORT_KEY not in line:
          self.port = line.strip().split(PORT_KEY)[1].strip().split(';')[0]
        elif PEER_ADDRESS_KEY in line:
          self.peer_address = line.strip().split(
              PEER_ADDRESS_KEY)[1].strip().split(';')[0]
        elif PEER_PORT_KEY in line:
          self.peer_port = line.strip().split(PEER_PORT_KEY)[1].strip().split(
              ';')[0]
        elif MAX_RESPONSE_DELAY_KEY in line:
          self.max_response_delay = line.strip().split(
              MAX_RESPONSE_DELAY_KEY)[1].strip().split(';')[0]
        elif MAX_UNACKED_UPDATES_KEY in line:
          self.max_unacked_updates = line.strip().split(
              MAX_UNACKED_UPDATES_KEY)[1].strip().split(';')[0]
        elif MCLT_KEY in line:
          self.mclt = line.strip().split(MCLT_KEY)[1].strip().split(';')[0]
        elif SPLIT_KEY in line:
          self.split = line.strip().split(SPLIT_KEY)[1].strip().split(';')[0]
        elif LOAD_BALANCE_MAX_SECONDS_KEY in line:
          self.load_balance_max_seconds = line.strip().split(
              LOAD_BALANCE_MAX_SECONDS_KEY)[1].strip().split(';')[0]
      if line.endswith('}') and len(peer) > 0:
        break
    self.peer = peer


SUBNET_KEY = 'subnet'
NTP_OPTION_KEY = 'option ntp-servers'
SUBNET_MASK_OPTION_KEY = 'option subnet-mask'
BROADCAST_OPTION_KEY = 'option broadcast-address'
ROUTER_OPTION_KEY = 'option routers'
DNS_OPTION_KEY = 'option domain-name-servers'
INTERFACE_KEY = 'interface'
AUTHORITATIVE_KEY = 'authoritative'


class DHCPSubnet:
  """Represents the DHCP Servers subnet configuration"""

  def __init__(self, subnet):
    self._authoritative = False
    self._subnet = None
    self._ntp_servers = None
    self._subnet_mask = None
    self._broadcast = None
    self._routers = None
    self._dns_servers = None
    self._interface = None
    self.pools = []

    self.resolve_subnet(subnet)
    self.resolve_pools(subnet)

  def __str__(self):
    config = 'subnet {SUBNET_OPTION} netmask {SUBNET_MASK_OPTION} {{'
    config += ('\n\t{NTP_OPTION_KEY} {NTP_OPTION};'
               if self._ntp_servers is not None else '')
    config += ('\n\t{SUBNET_MASK_OPTION_KEY} {SUBNET_MASK_OPTION};'
               if self._subnet_mask is not None else '')
    config += ('\n\t{BROADCAST_OPTION_KEY} {BROADCAST_OPTION};'
               if self._broadcast is not None else '')
    config += ('\n\t{ROUTER_OPTION_KEY} {ROUTER_OPTION};'
               if self._routers is not None else '')
    config += ('\n\t{DNS_OPTION_KEY} {DNS_OPTION};'
               if self._dns_servers is not None else '')
    config += ('\n\t{INTERFACE_KEY} {INTERFACE_OPTION};'
               if self._interface is not None else '')
    config += '\n\t{AUTHORITATIVE_KEY};' if self._authoritative else ''

    config = config.format(length='multi-line',
                           SUBNET_OPTION=self._subnet,
                           NTP_OPTION_KEY=NTP_OPTION_KEY,
                           NTP_OPTION=self._ntp_servers,
                           SUBNET_MASK_OPTION_KEY=SUBNET_MASK_OPTION_KEY,
                           SUBNET_MASK_OPTION=self._subnet_mask,
                           BROADCAST_OPTION_KEY=BROADCAST_OPTION_KEY,
                           BROADCAST_OPTION=self._broadcast,
                           ROUTER_OPTION_KEY=ROUTER_OPTION_KEY,
                           ROUTER_OPTION=self._routers,
                           DNS_OPTION_KEY=DNS_OPTION_KEY,
                           DNS_OPTION=self._dns_servers,
                           INTERFACE_KEY=INTERFACE_KEY,
                           INTERFACE_OPTION=self._interface,
                           AUTHORITATIVE_KEY=AUTHORITATIVE_KEY)

    # if not self._authoritative:
    #   config = config.replace(AUTHORITATIVE_KEY, '#' + AUTHORITATIVE_KEY)

    for pool in self.pools:
      config += '\n\t' + str(pool)

    config += '\n}'
    return config

  def disable_peer(self):
    for pool in self.pools:
      pool.disable_peer()

  def enable_peer(self):
    for pool in self.pools:
      pool.enable_peer()

  def set_subnet(self, subnet, netmask=None):
    if netmask is None:
      netmask = '255.255.255.0'
    self._subnet = subnet
    self._subnet_mask = netmask

    # Calculate the broadcast from the subnet and netmask
    broadcast = self.calculate_broadcast_address(subnet, netmask)
    self._broadcast = broadcast

  def calculate_broadcast_address(self, subnet_address, netmask):
    subnet_octets = subnet_address.split('.')
    netmask_octets = netmask.split('.')

    subnet_int = int(
        ''.join(format(int(octet), '08b') for octet in subnet_octets), 2)
    netmask_int = int(
        ''.join(format(int(octet), '08b') for octet in netmask_octets), 2)

    broadcast_int = subnet_int | (~netmask_int & 0xffffffff)
    broadcast_octets = [(broadcast_int >> (i * 8)) & 0xff
                        for i in range(3, -1, -1)]

    return '.'.join(str(octet) for octet in broadcast_octets)

  def resolve_subnet(self, subnet):
    subnet_parts = subnet.split('\n')
    for part in subnet_parts:
      if part.strip().startswith(SUBNET_KEY):
        self._subnet = part.strip().split()[1]
      elif NTP_OPTION_KEY in part:
        self._ntp_servers = part.strip().split(NTP_OPTION_KEY)[1].strip().split(
            ';')[0]
      elif SUBNET_MASK_OPTION_KEY in part:
        self._subnet_mask = part.strip().split(
            SUBNET_MASK_OPTION_KEY)[1].strip().split(';')[0]
      elif BROADCAST_OPTION_KEY in part:
        self._broadcast = part.strip().split(
            BROADCAST_OPTION_KEY)[1].strip().split(';')[0]
      elif ROUTER_OPTION_KEY in part:
        self._routers = part.strip().split(ROUTER_OPTION_KEY)[1].strip().split(
            ';')[0]
      elif DNS_OPTION_KEY in part:
        self._dns_servers = part.strip().split(DNS_OPTION_KEY)[1].strip().split(
            ';')[0]
      elif INTERFACE_KEY in part:
        self._interface = part.strip().split(INTERFACE_KEY)[1].strip().split(
            ';')[0]
      elif AUTHORITATIVE_KEY in part:
        self._authoritative = True

  def resolve_pools(self, subnet):
    regex = r'(pool.*)\}'
    pools = re.findall(regex, subnet, re.MULTILINE | re.DOTALL)
    for pool in pools:
      dhcp_pool = DHCPPool(pool)
      self.pools.append(dhcp_pool)


FAILOVER_KEY = 'failover peer'
RANGE_KEY = 'range'


class DHCPPool:
  """Represents a DHCP Servers subnet pool configuration"""

  def __init__(self, pool):
    self.failover_peer = None
    self.range_start = None
    self.range_end = None
    self.resolve_pool(pool)
    self._peer_enabled = True

  def __str__(self):
    config = 'pool {{'
    config += ('\n\t\t{FAILOVER_KEY} "{FAILOVER}";'
               if self.failover_peer is not None else '')
    config += ('\n\t\t{RANGE_KEY} {RANGE_START} {RANGE_END};'
               if self.range_start is not None and self.range_end is not None
               else '')
    config += '\n\t}}'

    config = config.format(
        length='multi-line',
        FAILOVER_KEY=FAILOVER_KEY,
        FAILOVER=self.failover_peer,
        RANGE_KEY=RANGE_KEY,
        RANGE_START=self.range_start,
        RANGE_END=self.range_end,
    )

    if not self._peer_enabled:
      config = config.replace(FAILOVER_KEY, '#' + FAILOVER_KEY)

    return config

  def disable_peer(self):
    self._peer_enabled = False

  def enable_peer(self):
    self._peer_enabled = True

  def set_range(self, start, end):
    self.range_start = start
    self.range_end = end

  def resolve_pool(self, pool):
    pool_parts = pool.split('\n')
    for part in pool_parts:
      if FAILOVER_KEY in part:
        self.failover_peer = part.strip().split(FAILOVER_KEY)[1].strip().split(
            ';')[0].replace('\"', '')
      if RANGE_KEY in part:
        pool_range = part.strip().split(RANGE_KEY)[1].strip().split(';')[0]
        self.range_start = pool_range.split(' ')[0].strip()
        self.range_end = pool_range.split(' ')[1].strip()


HOST_KEY = 'host'
HARDWARE_KEY = 'hardware ethernet'
FIXED_ADDRESS_KEY = 'fixed-address'


class DHCPReservedHost:
  """Represents a DHCP Servers subnet pool configuration"""

  def __init__(self, hostname=None, hw_addr=None, fixed_addr=None, config=None):
    if config is None:
      self.host = hostname
      self.hw_addr = hw_addr
      self.fixed_addr = fixed_addr
    else:
      self.resolve_host(config)

  def __str__(self):

    config = """{HOST_KEY} {HOSTNAME} {{
    \r\t{HARDWARE_KEY} {HW_ADDR};
    \r\t{FIXED_ADDRESS_KEY} {RESERVED_IP};
    \r}}"""

    config = config.format(
        length='multi-line',
        HOST_KEY=HOST_KEY,
        HOSTNAME=self.host,
        HARDWARE_KEY=HARDWARE_KEY,
        HW_ADDR=self.hw_addr,
        FIXED_ADDRESS_KEY=FIXED_ADDRESS_KEY,
        RESERVED_IP=self.fixed_addr,
    )
    return config

  def resolve_host(self, reserved_host):
    host_parts = reserved_host.split('\n')
    for part in host_parts:
      if HOST_KEY in part:
        self.host = part.strip().split(HOST_KEY)[1].strip().split('{')[0]
      elif HARDWARE_KEY in part:
        self.hw_addr = part.strip().split(HARDWARE_KEY)[1].strip().split(';')[0]
      elif FIXED_ADDRESS_KEY in part:
        self.fixed_addr = part.strip().split(
            FIXED_ADDRESS_KEY)[1].strip().split(';')[0]
