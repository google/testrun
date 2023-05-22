"""Contains all the necessary classes to maintain the 
DHCP server's configuration"""
import re

CONFIG_FILE = '/etc/dhcp/dhcpd.conf'
CONFIG_FILE_TEST = 'network/modules/dhcp-1/conf/dhcpd.conf'

DEFAULT_LEASE_TIME_KEY = 'default-lease-time'


class DHCPConfig:
  """Represents the DHCP Servers configuration and gives access to modify it"""

  def __init__(self):
    self._default_lease_time = 300
    self.subnets = []
    self._peer = None

  def write_config(self):
    conf = str(self)
    print('Writing config: \n' + conf)
    with open(CONFIG_FILE, 'w', encoding='UTF-8') as conf_file:
      conf_file.write(conf)

  def resolve_config(self):
    with open(CONFIG_FILE, 'r', encoding='UTF-8') as f:
      conf = f.read()
    self.resolve_subnets(conf)
    self._peer = DHCPFailoverPeer(conf)

  def resolve_subnets(self, conf):
    self.subnets = []
    regex = r'(subnet.*)'
    subnets = re.findall(regex, conf, re.MULTILINE | re.DOTALL)
    for subnet in subnets:
      dhcp_subnet = DHCPSubnet(subnet)
      self.subnets.append(dhcp_subnet)

  def set_range(self, start, end, subnet=0, pool=0):
    print('Setting Range for pool ')
    print(self.subnets[subnet].pools[pool])
    self.subnets[subnet].pools[pool].range_start = start
    self.subnets[subnet].pools[pool].range_end = end

  # def resolve_settings(self, conf):
  #   lines = conf.split('\n')
  #   for line in lines:
  #     if DEFAULT_LEASE_TIME_KEY in line:
  #       self._default_lease_time = line.strip().split(
  #           DEFAULT_LEASE_TIME_KEY)[1].strip().split(';')[0]

  #   self.peer = peer

  def __str__(self):

    config = """\r{DEFAULT_LEASE_TIME_KEY} {DEFAULT_LEASE_TIME};"""

    config = config.format(length='multi-line',
                           DEFAULT_LEASE_TIME_KEY=DEFAULT_LEASE_TIME_KEY,
                           DEFAULT_LEASE_TIME=self._default_lease_time)

    config += '\n\n' + str(self.peer)
    for subnet in self._subnets:
      config += '\n\n' + str(subnet)
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

    self.resolve_peer(config)

  def __str__(self):
    config = '{FAILOVER_PEER_KEY} \"{FAILOVER_PEER}\" {{\n'
    config += '\tprimary;' if self.primary else 'secondary;'
    config += """\n\t{ADDRESS_KEY} {ADDRESS};
        {PORT_KEY} {PORT};
        {PEER_ADDRESS_KEY} {PEER_ADDRESS};
        {PEER_PORT_KEY} {PEER_PORT};
        {MAX_RESPONSE_DELAY_KEY} {MAX_RESPONSE_DELAY};
        {MAX_UNACKED_UPDATES_KEY} {MAX_UNACKED_UPDATES};
        {MCLT_KEY} {MCLT};
        {SPLIT_KEY} {SPLIT};
        {LOAD_BALANCE_MAX_SECONDS_KEY} {LOAD_BALANCE_MAX_SECONDS};
        \r}}"""

    return config.format(
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


NTP_OPTION_KEY = 'option ntp-servers'
SUBNET_MASK_OPTION_KEY = 'option subnet-mask'
BROADCAST_OPTION_KEY = 'option broadcast-address'
ROUTER_OPTION_KEY = 'option routers'
DNS_OPTION_KEY = 'option domain-name-servers'


class DHCPSubnet:
  """Represents the DHCP Servers subnet configuration"""

  def __init__(self, subnet):
    self._ntp_servers = None
    self._subnet_mask = None
    self._broadcast = None
    self._routers = None
    self._dns_servers = None
    self.pools = []

    self.resolve_subnet(subnet)
    self.resolve_pools(subnet)

  def __str__(self):
    config = """subnet 10.10.10.0 netmask {SUBNET_MASK_OPTION} {{
            \r\t{NTP_OPTION_KEY} {NTP_OPTION};
            \r\t{SUBNET_MASK_OPTION_KEY} {SUBNET_MASK_OPTION};
            \r\t{BROADCAST_OPTION_KEY} {BROADCAST_OPTION};
            \r\t{ROUTER_OPTION_KEY} {ROUTER_OPTION};
            \r\t{DNS_OPTION_KEY} {DNS_OPTION};"""

    config = config.format(length='multi-line',
                           NTP_OPTION_KEY=NTP_OPTION_KEY,
                           NTP_OPTION=self._ntp_servers,
                           SUBNET_MASK_OPTION_KEY=SUBNET_MASK_OPTION_KEY,
                           SUBNET_MASK_OPTION=self._subnet_mask,
                           BROADCAST_OPTION_KEY=BROADCAST_OPTION_KEY,
                           BROADCAST_OPTION=self._broadcast,
                           ROUTER_OPTION_KEY=ROUTER_OPTION_KEY,
                           ROUTER_OPTION=self._routers,
                           DNS_OPTION_KEY=DNS_OPTION_KEY,
                           DNS_OPTION=self._dns_servers)
    for pool in self.pools:
      config += '\n\t' + str(pool)

    config += '\n\r}'
    return config

  def resolve_subnet(self, subnet):
    subnet_parts = subnet.split('\n')
    for part in subnet_parts:
      if NTP_OPTION_KEY in part:
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

  def __str__(self):

    config = """pool {{
        \r\t\t{FAILOVER_KEY} "{FAILOVER}";
        \r\t\t{RANGE_KEY} {RANGE_START} {RANGE_END};
        \r\t}}"""

    return config.format(
        length='multi-line',
        FAILOVER_KEY=FAILOVER_KEY,
        FAILOVER=self.failover_peer,
        RANGE_KEY=RANGE_KEY,
        RANGE_START=self.range_start,
        RANGE_END=self.range_end,
    )

  def resolve_pool(self, pool):
    pool_parts = pool.split('\n')
    # pool_parts = pool.split("\n")
    for part in pool_parts:
      if FAILOVER_KEY in part:
        self.failover_peer = part.strip().split(FAILOVER_KEY)[1].strip().split(
            ';')[0].replace('\"', '')
      if RANGE_KEY in part:
        pool_range = part.strip().split(RANGE_KEY)[1].strip().split(';')[0]
        self.range_start = pool_range.split(' ')[0].strip()
        self.range_end = pool_range.split(' ')[1].strip()
