from collections import namedtuple
import pytest
from unittest.mock import patch
from common import util

snicaddr = namedtuple('snicaddr',
                      ['family', 'address'])

mock_addrs = {
    'eth0': [snicaddr(17, '00:1A:2B:3C:4D:5E')],
    'wlan0': [snicaddr(17, '66:77:88:99:AA:BB')],
    'enp0s3': [snicaddr(17, '11:22:33:44:55:66')]
}

@patch('psutil.net_if_addrs')
def test_get_sys_interfaces(mock_net_if_addrs):
  mock_net_if_addrs.return_value = mock_addrs
  # Expected result
  expected = {
      'eth0': '00:1A:2B:3C:4D:5E',
      'enp0s3': '11:22:33:44:55:66'
  }

  result = util.get_sys_interfaces()
  # Assert the result
  assert result == expected
