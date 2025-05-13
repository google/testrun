# Use Ubuntu base image
FROM ubuntu@sha256:e6173d4dc55e76b87c4af8db8821b1feae4146dd47341e4d431118c7dd060a74

# Set non-interactive mode for apt
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && \
    apt-get install -y isc-dhcp-client dnsutils netcat-openbsd arping python3 python3-pip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install dependencies (BAC0)
RUN pip install BAC0==23.7.3 pytz==2024.2 netifaces==0.11.0 pymodbus==3.0.0 pyserial pyserial-asyncio

# Copy scripts
WORKDIR /app
COPY entrypoint.sh /entrypoint.sh
COPY entrypoint.py /entrypoint.py

# Make script executable
RUN chmod +x /entrypoint.sh /entrypoint.py

# Start BACnet device
ENTRYPOINT ["/entrypoint.sh"]
