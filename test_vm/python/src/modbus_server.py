from pyModbusTCP.server import ModbusServer, DataBank

if __name__ == "__main__":
    # Создаем сервер на порту 502 (или 5020, если нет прав)
    server = ModbusServer(host="0.0.0.0", port=502, no_block=True)
    server.start()
    print("Modbus TCP server started on port 502")

    # Пример: инициализация регистров
    DataBank.set_words(0, [0]*100)  # Holding registers
    DataBank.set_bits(0, [0]*100)   # Coils

    try:
        while True:
            pass  # Сервер работает в основном потоке
    except KeyboardInterrupt:
        print("Stopping server...")
        server.stop()