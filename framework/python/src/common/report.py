# Copyright 2024 Google LLC
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

"""Report generating functions"""
import requests
from io import BytesIO
from common import logger

LOGGER = logger.get_logger('report')

def html_to_pdf(html: str, file_name: str):
  """ Generating PDF from HTML"""
  try:
    resp = requests.post(
                        f'http://localhost:8001/pdf/{file_name}',
                        data={'html': html}, timeout=10
                        )
    if resp.status_code == 200:
      return BytesIO(resp.content)
    raise requests.exceptions.RequestException
  except requests.exceptions.RequestException:
    LOGGER.error('An error occured whilst generating PDF report.')
