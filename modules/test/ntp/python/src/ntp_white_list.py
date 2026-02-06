"""Module to resolve NTP whitelist domains to IP addresses asynchronously."""

import asyncio
import concurrent.futures
import threading
import dns.asyncresolver
from logging import Logger


class NTPWhitelistResolver:
  """Class to resolve NTP whitelist domains to IP addresses."""

  def __init__(self,
               config: dict,
               logger: Logger,
               semaphore_limit: int = 50,
               timeout: int = 30
              ):
    self.config = config
    self.semaphore_limit = semaphore_limit
    self.timeout = timeout
    self._logger = logger
    self._ip_whitelist = self._get_ntp_whitelist_ips()

  # Create the final list of NTP domains to resolve
  def _create_final_ntp_domain_list(
    self,
    pools_with_subdomains: list[str],
    single_servers: list[str]
  ) -> list[str]:
    ntp_domains = []
    for pool in pools_with_subdomains:
      for i in range(4):
        ntp_domains.append(f"{i}.{pool}")
      ntp_domains.append(pool)
    ntp_domains.extend(single_servers)
    return ntp_domains

  # Resolve a domain to its IP addresses
  async def _resolve_domain(
      self, domain: str, dns_servers: list[str], attempts: int = 2
  ) -> set[str]:
    ips = set()
    for _ in range(attempts):
      for dns_server in dns_servers:
        resolver = dns.asyncresolver.Resolver()
        resolver.nameservers = [dns_server]
        try:
          answers = await resolver.resolve(domain, "A", lifetime=2)
          for rdata in answers:
            ips.add(rdata.address)
        except Exception:
          pass
        try:
          answers6 = await resolver.resolve(domain, "AAAA", lifetime=2)
          for rdata in answers6:
            ips.add(rdata.address)
        except Exception:
          pass
    return ips

  async def _sem_task(
      self,
      domain: str,
      dns_servers: list[str],
      semaphore: asyncio.Semaphore
  ) -> set[str]:
    async with semaphore:
      return await self._resolve_domain(domain, dns_servers)

  # Get IPs for NTP whitelist
  async def _get_ips_whitelist(
        self, config, semaphore_limit: int, timeout: int
  ) -> set[str]:
    pools_with_subdomains = config.get("pools_with_subdomains", [])
    single_servers = config.get("single_servers", [])
    dns_servers = config.get("dns_servers", [])
    ntp_domain_list = self._create_final_ntp_domain_list(
        pools_with_subdomains, single_servers
    )
    semaphore = asyncio.Semaphore(semaphore_limit)
    tasks = [self._sem_task(
                domain,
                dns_servers,
                semaphore)
                for domain in ntp_domain_list
            ]
    all_ips = set()
    for coro in asyncio.as_completed(tasks, timeout=timeout):
      try:
        ips = await coro
        if isinstance(ips, set):
          all_ips.update(ips)
      except asyncio.TimeoutError:
        break
    self._logger.info(f"Added {len(all_ips)} IPs to NTP whitelist.")
    return all_ips

  def _get_ntp_whitelist_ips(
      self,
      semaphore_limit: int = 50,
      timeout: int = 30
  ) -> set[str]:
    # Always run in a separate thread to ensure we have a clean event loop context
    def run_in_thread():
      new_loop = asyncio.new_event_loop()
      asyncio.set_event_loop(new_loop)
      try:
        return new_loop.run_until_complete(
            self._get_ips_whitelist(self.config, semaphore_limit, timeout))
      finally:
        new_loop.close()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
      return executor.submit(run_in_thread).result()

  # Check if an IP is whitelisted
  def is_ip_whitelisted(self, ip: str) -> bool:
    return ip in self._ip_whitelist
