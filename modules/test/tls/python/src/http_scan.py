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
"""Module that contains various methods for scaning for HTTP/HTTPS services"""
import nmap
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning


LOGGER = None
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


class HTTPScan():
  """Helper class to scan for all HTTP/HTTPS services for a device"""

  def __init__(self, logger):
    global LOGGER
    LOGGER = logger

  def scan_all_ports(self, ip):
    """Scans all ports and identifies potential HTTP/HTTPS ports."""
    nm = nmap.PortScanner()
    nm.scan(hosts=ip, ports='1-65535', arguments='--open -sV')

    http_ports = []
    for host in nm.all_hosts():
      for proto in nm[host].all_protocols():
        for port in nm[host][proto].keys():
          service = nm[host][proto][port]['name']
          if 'http' in service:
            http_ports.append(port)
    return http_ports

  def scan_http_ports(self, ip):
    """Scans HTTP/HTTPS ports."""
    nm = nmap.PortScanner()
    nm.scan(hosts=ip, ports='80,443', arguments='--open -sV')

    http_ports = []
    if ip in nm.all_hosts():
      for port in [80, 443]:
        if port in nm[ip]['tcp'] and nm[ip]['tcp'][port]['state'] == 'open':
          http_ports.append(port)
    return http_ports

  def is_https(self, ip, port):
    """
    Detects if the port serves HTTPS, HTTP, or neither.
    Returns 'HTTPS', 'HTTP' or 'UNKNOWN'.
    """

    # Try HTTPS first
    try:
      requests.head(f'https://{ip}:{port}', verify=False, timeout=5)
      LOGGER.info(f'Port {port} supports HTTPS.')
      return 'HTTPS'
    except requests.exceptions.SSLError as e:
      # This error occurs if the SSL handshake fails for any reason
      # (like a cipher mismatch),
      # but the server still responded at the SSL layer.
      LOGGER.error(f'Port {port} is likely HTTPS-based: {e}')
      return 'HTTPS'
    except requests.exceptions.ConnectionError as e:
      LOGGER.info(f'Connection failed for HTTPS on port {port}: {e}')
    except requests.exceptions.Timeout:
      LOGGER.info(f'Request timed out for HTTPS on port {port}.')
    except Exception as e:
      LOGGER.error(f'An unexpected error occurred during HTTPS check: {e}')

    # try HTTP
    try:
      requests.head(f'http://{ip}:{port}', timeout=5)
      LOGGER.info(f'Port {port} supports HTTP.')
      return 'HTTP'
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
      LOGGER.info(f'Port {port} does not support HTTP.')
    except Exception as e:
      LOGGER.error(f'An unexpected error occurred during HTTP check: {e}')

    return 'UNKNOWN'

  def verify_http_or_https(self, ip, ports):
    """Classifies each port as HTTP, HTTPS, or UNKNOWN."""
    results = {}
    for port in ports:
      protocol = self.is_https(ip, port)
      results[port] = protocol
    return results

  def scan_for_http_services(self, ip_address):
    LOGGER.info(f'Scanning for HTTP ports on {ip_address}')
    http_ports = self.scan_http_ports(ip_address)
    results = None
    if len(http_ports) > 0:
      LOGGER.info(f'Checking HTTP ports on {ip_address}: {http_ports}')
      results = self.verify_http_or_https(ip_address, http_ports)
      for port, service_type in results.items():
        LOGGER.info(f'Port {port}: {service_type}')
    return results
