"""Module to resolve NTP whitelist domains to IP addresses asynchronously."""

import asyncio
import aiohttp
import concurrent.futures
import ntplib

NTP_URL = 'https://ntppool.org/scores/{ip}/json'


async def fetch_ntp_status(
    session: aiohttp.ClientSession,
    ip: str
  ) -> tuple[str, bool]:
  """Fetch the NTP status for a single IP address."""
  try:
    async with session.get(NTP_URL.format(ip=ip), timeout=10) as response:
      if response.status == 200:
        data = await response.json()
        score = data['monitors'][0].get('score', 0)
        active = score >= 10
        return (ip, active)
      else:
        return (ip, False)
  except Exception:
    return (ip, False)


async def _check_all_ips_async(ip_list: list[str]) -> list[tuple[str, bool]]:
  """Check NTP status for all IPs asynchronously."""
  async with aiohttp.ClientSession() as session:
    tasks = [fetch_ntp_status(session, ip) for ip in ip_list]
    # Run all tasks concurrently
    results = await asyncio.gather(*tasks)
    return results

def _get_ntp_data(ip):
  """Check NTP status for a single IP address."""
  client = ntplib.NTPClient()
  try:
    client.request(ip, version=3, timeout=2)
    return True
  except ntplib.NTPException:
    return False


def check_all_ips(ip_list: list[str]) -> list[tuple[str, bool]]:
  """Check NTP status for all IPs in a separate thread."""  
  def run_in_thread():
    new_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(new_loop)
    try:
      return new_loop.run_until_complete(_check_all_ips_async(ip_list))
    finally:
      new_loop.close()

  with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
    future = executor.submit(run_in_thread)
    ntps = future.result()
    for i in range(len(ntps)):
      ip, trusted = ntps[i]
      if not trusted:
        trusted = _get_ntp_data(ip)
      ntps[i] = (ip, trusted)
    return ntps
