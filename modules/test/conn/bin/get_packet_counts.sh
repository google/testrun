#!/bin/bash

# Check if MAC address and pcap file arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <MAC_ADDRESS> <PCAP_FILE>"
  exit 1
fi

# Assign MAC address and pcap file from arguments
PCAP_FILE="$1"
MAC_ADDRESS="$2"

# Check if the pcap file exists
if [ ! -f "$PCAP_FILE" ]; then
  echo "Error: File $PCAP_FILE does not exist."
  exit 1
fi

# Count multicast packets from the MAC address
multicast_from_count=$(tshark -r "$PCAP_FILE" -Y "(eth.dst[0] == 1) && eth.src == $MAC_ADDRESS" -T fields -e frame.number | wc -l)

# Count multicast packets to the MAC address
multicast_to_count=$(tshark -r "$PCAP_FILE" -Y "(eth.dst[0] == 1) && eth.dst == $MAC_ADDRESS" -T fields -e frame.number | wc -l)

# Count broadcast packets from the MAC address (broadcast MAC address is FF:FF:FF:FF:FF:FF)
broadcast_from_count=$(tshark -r "$PCAP_FILE" -Y "eth.dst == ff:ff:ff:ff:ff:ff && eth.src == $MAC_ADDRESS" -T fields -e frame.number | wc -l)

# Count broadcast packets to the MAC address
broadcast_to_count=$(tshark -r "$PCAP_FILE" -Y "eth.dst == ff:ff:ff:ff:ff:ff && eth.dst == $MAC_ADDRESS" -T fields -e frame.number | wc -l)

# Count unicast packets from the MAC address
unicast_from_count=$(tshark -r "$PCAP_FILE" -Y "eth.dst != ff:ff:ff:ff:ff:ff && (eth.dst[0] & 1) == 0 && eth.src == $MAC_ADDRESS" -T fields -e frame.number | wc -l)

# Count unicast packets to the MAC address
unicast_to_count=$(tshark -r "$PCAP_FILE" -Y "eth.dst != ff:ff:ff:ff:ff:ff && (eth.dst[0] & 1) == 0 && eth.dst == $MAC_ADDRESS" -T fields -e frame.number | wc -l)

# Output the results as a JSON object
echo "{
  \"mac_address\": \"$MAC_ADDRESS\",
  \"multicast\": {
    \"from\": $multicast_from_count,
    \"to\": $multicast_to_count
  },
  \"broadcast\": {
    \"from\": $broadcast_from_count,
    \"to\": $broadcast_to_count
  },
  \"unicast\": {
    \"from\": $unicast_from_count,
    \"to\": $unicast_to_count
  }
}"
