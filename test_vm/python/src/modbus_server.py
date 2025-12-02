"""Modbus TCP server implementation."""
from pyModbusTCP.server import ModbusServer, DataBank

if __name__ == "__main__":
  # Run server on port 502

  server = ModbusServer(host="0.0.0.0", port=502, no_block=True)
  server.start()
  print("Modbus TCP server started on port 502")

  # Initialize data bank with zeros
  DataBank.set_words(0, [0]*100)  # Holding registers
  DataBank.set_bits(0, [0]*100)   # Coils

  try:
    while True:
      pass  # Keep the server running
  except KeyboardInterrupt:
    print("Stopping server...")
    server.stop()
