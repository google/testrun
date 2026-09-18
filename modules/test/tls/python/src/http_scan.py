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

_MSG_HTTP_NOT_DETECTED = 'No HTTP server detected on the device.'
_MSG_HTTP_COMPLIANT = 'Device HTTP server is COMPLIANT with the RFC 9110'
_MSG_HTTP_NON_COMPLIANT = 'Device HTTP server is NON-COMPLIANT with the RFC 9110'
_MSG_HTTP_ERROR = 'Error checking HTTP server.'


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
    result = 'UNKNOWN'

    # try HTTP first
    try:
      response = requests.get(f'http://{ip}:{port}', timeout=20, stream=True)
      content = ''
      if response.status_code == 400:
        content = response.raw.read(512).decode(
          'utf-8', errors='ignore'
          ).lower()
      response.close()
      if ('sent to http port' in content or
          'ssl' in content or
          'https' in content
          ):
        LOGGER.info(f'Port {port} returned HTTPS-redirection.')
        result = 'HTTPS'
      else:
        LOGGER.info(f'Port {port} supports HTTP.')
        return 'HTTP'
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
      LOGGER.info(f'Port {port} does not support HTTP.')
    except Exception as e:
      LOGGER.error(f'An unexpected error occurred during HTTP check: {e}')

    # Try HTTPS
    try:
      response = requests.get(
        f'https://{ip}:{port}',
        verify=False, # nosec B501
        timeout=20,
        stream=True
      )
      LOGGER.info(f'Port {port} supports HTTPS.')
      response.close()
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

    return result

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

  def http_server_compliance(self, ip:str) -> tuple[str, str, list[str]]:
    """Checks if HTTP GET and HEAD methods are supported."""
    result_state = 'Feature Not Detected'
    result_message = _MSG_HTTP_NOT_DETECTED
    result_details = []
    ports = self.scan_all_ports(ip)
    if not ports:
      msg = f'No HTTP/HTTPS ports found on {ip}'
      LOGGER.info(msg)
      return result_state, result_message, result_details
    if '443' in ports:
      url = f'https://{ip}'
    else:
      url = f'http://{ip}'
    LOGGER.info(f'Checking HTTP methods on {url}')
    try:
      get_resp = requests.get(url, timeout=20, verify=False)  # nosec B501
      get_ok = get_resp.status_code == 200
      head_resp = requests.head(url, timeout=20, verify=False)  # nosec B501
      head_ok = head_resp.status_code == 200
      method_resp = requests.request(
        'foobar',
        url,
        timeout=20,
        verify=False)  # nosec B501
    except requests.exceptions.RequestException as e:
      LOGGER.error(f'Error checking HTTP methods on {url}: {e}')
      return 'Error', _MSG_HTTP_ERROR, []
    if not get_ok or not head_ok:
      LOGGER.info(f'HTTP GET/HEAD method is not supported on {url}')
      result_state = 'Non-Compliant'
      result_message = _MSG_HTTP_NON_COMPLIANT
      if not get_ok:
        result_details.append('Server does not support GET')
      if not head_ok:
        result_details.append('Server does not support HEAD')
    elif get_ok and head_ok:
      LOGGER.info(f'HTTP GET and HEAD methods are supported on {url}')
      result_state = 'Compliant'
      result_message = _MSG_HTTP_COMPLIANT
      result_details.extend([
        'Server supports GET method',
        'Server supports HEAD method'
      ])
      head_body_len = len(head_resp.content)
      head_body_empty = head_body_len == 0
      headers_match = True
      header_not_match = ''
      for header in ('Content-Length', 'Content-Type'):
        if header in get_resp.headers or header in head_resp.headers:
          if get_resp.headers.get(header) != head_resp.headers.get(header):
            headers_match = False
            header_not_match = header
            break
      if not head_body_empty or not headers_match:
        result_state = 'Non-Compliant'
        result_message = _MSG_HTTP_NON_COMPLIANT
        if not head_body_empty:
          LOGGER.info('HEAD response body is not empty')
          result_details.append('HEAD response body is not empty')
        elif not headers_match:
          LOGGER.info(f'{header_not_match} does not match between GET and HEAD')
          result_details.append(f'Header {header_not_match} does not match.')
      else:
        LOGGER.info('HEAD response body is empty.')
        LOGGER.info('Headers match between GET and HEAD methods.')
        result_details.extend([
          'HEAD response body is empty',
          'Headers match between GET and HEAD methods'
        ])
      if method_resp.status_code == 501 or method_resp.status_code == 405:
        msg = 'Device server returns 501 or 405 for unsupported methods'
        LOGGER.info(msg)
        result_details.append(msg)
      else:
        result_state = 'Non-Compliant'
        result_message = _MSG_HTTP_NON_COMPLIANT
        msg = 'Device server does not return 501 or 405 for unsupported methods'
        LOGGER.info(msg)
        result_details.append(msg)

    return result_state, result_message, result_details
