# Copyright 2026 Google LLC
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

"""REST API access control tests (b/583870415)"""

import asyncio
import json
import os
from unittest.mock import MagicMock, patch

import pytest

from api import api


# pylint: disable=redefined-outer-name,protected-access


ROOT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", ".."))

LOCAL_UI = "http://localhost:8080"
OTHER_SITE = "https://evil.example"

VALID_CONFIG = {
    "network": {"device_intf": "eth1", "internet_intf": "eth0"},
    "log_level": "INFO",
}

# State-changing routes that take a JSON body
JSON_ROUTES = [
    ("POST", "/system/config"),
    ("POST", "/system/start"),
    ("POST", "/device"),
    ("POST", "/device/edit"),
    ("DELETE", "/device"),
    ("POST", "/profiles"),
    ("DELETE", "/profiles"),
    ("DELETE", "/system/config/certs"),
]

PREFLIGHT_HEADERS = {
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
}


@pytest.fixture
def testrun():
  """Mock of the Testrun object with just enough behaviour for the API"""
  testrun_obj = MagicMock()
  testrun_obj.get_root_dir.return_value = ROOT_DIR
  session = testrun_obj.get_session.return_value
  session.get_api_port.return_value = 8000
  session.get_config.return_value = VALID_CONFIG
  session.to_json.return_value = {"status": "Idle"}
  return testrun_obj


@pytest.fixture
def app(testrun):
  """ASGI app of the API, with the Testrun calls made during setup cleared"""
  asgi_app = api.Api(testrun)._app
  testrun.reset_mock()
  return asgi_app


def send_request(asgi_app, method, path, headers=None, body=b""):
  """Sends one HTTP request straight to an ASGI app.

  Args:
    asgi_app: The ASGI application to call.
    method: The HTTP method.
    path: The request path.
    headers: Request headers. The Host header defaults to 127.0.0.1:8000.
    body: The raw request body.

  Returns:
    A tuple of the status code, the response headers and the body text.
  """
  request_headers = {"host": "127.0.0.1:8000"}
  request_headers.update(
      {name.lower(): value for name, value in (headers or {}).items()})
  scope = {
      "type": "http",
      "asgi": {"version": "3.0"},
      "http_version": "1.1",
      "method": method,
      "scheme": "http",
      "path": path,
      "raw_path": path.encode(),
      "query_string": b"",
      "root_path": "",
      "headers": [(name.encode(), value.encode())
                  for name, value in request_headers.items()],
      "client": ("127.0.0.1", 50000),
      "server": ("127.0.0.1", 8000),
  }
  incoming = [{"type": "http.request", "body": body, "more_body": False}]
  sent = []

  async def receive():
    if incoming:
      return incoming.pop(0)
    return {"type": "http.disconnect"}

  async def send(message):
    sent.append(message)

  asyncio.run(asgi_app(scope, receive, send))

  start = next(m for m in sent if m["type"] == "http.response.start")
  response_headers = {name.decode(): value.decode()
                      for name, value in start["headers"]}
  response_body = b"".join(
      m.get("body", b"") for m in sent if m["type"] == "http.response.body")
  return start["status"], response_headers, response_body.decode()


def test_api_listens_on_loopback_only(testrun):
  """The API is not reachable from other machines"""
  with patch.object(api.uvicorn, "run") as run:
    api.Api(testrun)._start()

  assert run.call_args.kwargs["host"] == "127.0.0.1"


@pytest.mark.parametrize("origin",
                         [OTHER_SITE, "null", "http://localhost:9999"])
def test_cross_site_shutdown_is_blocked(app, testrun, origin):
  """Another website cannot shut Testrun down (CSRF)"""
  with patch.object(api.os, "kill") as kill:
    status, _, body = send_request(app, "POST", "/system/shutdown",
                                   headers={"Origin": origin})

  assert status == 403
  assert json.loads(body) == {"error": "Request origin is not allowed"}
  kill.assert_not_called()
  assert not testrun.mock_calls


@pytest.mark.parametrize("method,path", JSON_ROUTES)
def test_cross_site_json_request_is_blocked(app, testrun, method, path):
  """Another website cannot change Testrun state, even with a JSON body"""
  status, _, _ = send_request(
      app, method, path,
      headers={"Origin": OTHER_SITE, "Content-Type": "application/json"},
      body=json.dumps(VALID_CONFIG).encode())

  assert status == 403
  assert not testrun.mock_calls


@pytest.mark.parametrize("content_type", [
    None,
    "text/plain",
    "application/x-www-form-urlencoded",
    "multipart/form-data; boundary=testrun",
])
@pytest.mark.parametrize("method,path", JSON_ROUTES)
def test_non_json_body_is_rejected(app, testrun, method, path, content_type):
  """Bodies a browser can send without a CORS preflight are rejected"""
  headers = {"Content-Type": content_type} if content_type else {}
  status, _, body = send_request(app, method, path, headers=headers,
                                 body=json.dumps(VALID_CONFIG).encode())

  assert status == 415
  assert json.loads(body) == {
      "error": "Content-Type must be application/json"}
  assert not testrun.mock_calls


def test_local_ui_can_update_config(app, testrun):
  """The Testrun UI can still save the system configuration"""
  status, headers, _ = send_request(
      app, "POST", "/system/config",
      headers={"Origin": LOCAL_UI,
               "Content-Type": "application/json; charset=utf-8"},
      body=json.dumps(VALID_CONFIG).encode())

  assert status == 200
  assert headers["access-control-allow-origin"] == LOCAL_UI
  testrun.get_session.return_value.set_config.assert_called_once_with(
      VALID_CONFIG)


@pytest.mark.parametrize("headers", [{}, {"Origin": LOCAL_UI}])
def test_trusted_callers_reach_the_handler(app, headers):
  """Local tools (no Origin header) and the Testrun UI are not blocked"""
  status, _, body = send_request(app, "POST", "/system/stop",
                                 headers=headers)

  # The stop handler answers 404 because no test is running
  assert status == 404
  assert json.loads(body) == {"error": "Testrun is not currently running"}


def test_cors_preflight_allows_local_ui(app):
  """The browser lets the Testrun UI send JSON requests"""
  status, headers, _ = send_request(
      app, "OPTIONS", "/system/config",
      headers={"Origin": LOCAL_UI, **PREFLIGHT_HEADERS})

  assert status == 200
  assert headers["access-control-allow-origin"] == LOCAL_UI


def test_cors_preflight_rejects_other_sites(app):
  """The browser stops other websites from sending JSON requests"""
  status, headers, _ = send_request(
      app, "OPTIONS", "/system/config",
      headers={"Origin": OTHER_SITE, **PREFLIGHT_HEADERS})

  assert status == 400
  assert "access-control-allow-origin" not in headers


def test_other_sites_cannot_read_responses(app):
  """Without a CORS header the browser hides responses from other sites"""
  status, headers, _ = send_request(app, "GET", "/system/status",
                                    headers={"Origin": OTHER_SITE})

  assert status == 200
  assert "access-control-allow-origin" not in headers


@pytest.mark.parametrize("host", ["evil.example:8000", "192.168.1.20:8000"])
def test_unknown_host_header_is_rejected(app, host):
  """Requests addressed to other host names are rejected (DNS rebinding)"""
  status, _, _ = send_request(app, "GET", "/system/status",
                              headers={"Host": host})

  assert status == 400


@pytest.mark.parametrize("host", ["localhost:8000", "127.0.0.1:8000"])
def test_local_host_header_is_accepted(app, host):
  """Requests addressed to this machine are served"""
  status, _, body = send_request(app, "GET", "/system/status",
                                 headers={"Host": host})

  assert status == 200
  assert json.loads(body) == {"status": "Idle"}
