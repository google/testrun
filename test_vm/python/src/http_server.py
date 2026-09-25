"""Minimal HTTP backend used by the non-compliant VM test."""
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler


class NonCompliantBackendHandler(BaseHTTPRequestHandler):
  """Serve deliberately non-compliant HTTP responses for VM tests."""

  def log_message(self, log_format, *args):
    pass

  # These names are required by BaseHTTPRequestHandler's dispatch protocol.
  # pylint: disable=invalid-name
  def do_GET(self):
    self.send_response(200)
    self.send_header('Content-Type', 'text/html; charset=utf-8')
    self.send_header('Content-Length', '25')
    self.end_headers()
    self.wfile.write(b'GET response body content')

  def do_HEAD(self):
    self.send_response(405)
    self.send_header('Content-Type', 'text/plain')
    self.send_header('Content-Length', '18')
    self.end_headers()
    self.wfile.write(b'Method Not Allowed')
  # pylint: enable=invalid-name

  def dispatch_custom(self):
    self.send_response(200)
    self.send_header('Content-Type', 'text/plain')
    self.send_header('Content-Length', '2')
    self.end_headers()
    self.wfile.write(b'OK')

  def __getattr__(self, name):
    if name.startswith('do_'):
      return self.dispatch_custom
    raise AttributeError(name)

if __name__ == '__main__':
  port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
  server_address = ('127.0.0.1', port)
  httpd = HTTPServer(server_address, NonCompliantBackendHandler)
  httpd.serve_forever()
