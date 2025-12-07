"""
test_vm.python.src.modbus_server_non_compliant
"""

import socket
import struct


MODBUS_PORT = 502
MODBUS_EXCEPTION_CODE = 0x02  # Illegal Data Address


def parse_mbap_header(data):
  if len(data) < 7:
    return None
  tid, pid, length, uid = struct.unpack(">HHHB", data[:7])
  return tid, pid, length, uid


def build_exception_response(request, function_code, exception_code):
  tid, pid, _, uid = parse_mbap_header(request)
  resp_fc = function_code | 0x80
  pdu = struct.pack("BB", resp_fc, exception_code)
  mbap = struct.pack(">HHHB", tid, pid, len(pdu) + 1, uid)
  return mbap + pdu


def handle_request(conn, data):
  if len(data) < 8:
    return
  # tid, pid, length, uid = parse_mbap_header(data)
  function_code = data[7]
  response = build_exception_response(
    data, function_code, MODBUS_EXCEPTION_CODE)
  conn.sendall(response)


def run_server():
  sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
  sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
  sock.bind(("0.0.0.0", MODBUS_PORT))
  sock.listen(5)
  print(f"Modbus server started on port {MODBUS_PORT}")
  while True:
    conn, addr = sock.accept()
    print(f"Connection from {addr}")
    try:
      while True:
        data = conn.recv(1024)
        if not data:
          break
        handle_request(conn, data)
    except Exception as e:
      print(f"Error: {e}")
    finally:
      conn.close()


if __name__ == "__main__":
  run_server()
