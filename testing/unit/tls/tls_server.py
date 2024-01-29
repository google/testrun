import http.server
import socketserver
import ssl

class TLSServer:
    def __init__(self, certfile, keyfile, port=8443):
        self.certfile = certfile
        self.keyfile = keyfile
        self.port = port
        self.httpd = None

    def start(self):
        # Setup the server with SSL
        server_address = ('localhost', self.port)
        self.httpd = socketserver.TCPServer(server_address, MyHandler)
        ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        ssl_context.options |= 0x04  # Set OP_LEGACY_SERVER_CONNECT on the SSLContext
        ssl_context.load_cert_chain(certfile=self.certfile, keyfile=self.keyfile)
        self.httpd.socket = ssl_context.wrap_socket(self.httpd.socket, server_side=True)

        print(f'Starting server on port {self.port}...')
        self.httpd.serve_forever()

    def stop(self):
        if self.httpd:
            print('Stopping server...')
            self.httpd.shutdown()

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def handle_request(self):
        print("Request handled")
        super().handle_request()

    def do_GET(self):
        print("GET called")
        if self.path == '/':
            # Handle the root path
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'Hello, world!')
        elif self.path == '/check_legacy':
            # Check if the legacy server option is present in the client's SSL context
            if not (self.connection.context._sslobj.options & 0x04):
                print("Legacy flag is not set on the client's SSL context.")
                # If not present, raise an SSL error
                raise ssl.SSLError(ssl.SSL_ERROR_SSL, "[SSL: UNSAFE_LEGACY_RENEGOTIATION_DISABLED] unsafe legacy renegotiation disabled (_ssl.c:1007)")
            else:
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(b'Legacy flag is set on the client\'s SSL context.')
        else:
            # Handle other paths
            super().do_GET()
         
# class MyHandler:
#     def do_GET(self, request):
#         # Check if the legacy server option is present in the client's SSL context
#         if not (request.context._sslobj.options & 0x04):
#             print("Legacy flag is not set on the client's SSL context.")
#             # Respond with a 500 Internal Server Error
#             response = b"HTTP/1.1 500 Internal Server Error\r\nContent-type: text/html\r\n\r\nInternal Server Error"
#             request.sendall(response)
#             return

#         # Handle the root path
#         response = b"HTTP/1.1 200 OK\r\nContent-type: text/html\r\n\r\nHello, world!"
#         request.sendall(response)