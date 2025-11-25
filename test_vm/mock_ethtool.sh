#!/bin/bash

sudo tee /usr/local/bin/ethtool > /dev/null <<'EOF'
#!/bin/bash
if [[ "$1" == "enbr99" ]]; then
  cat <<EOT
Settings for enbr99:
    Supported ports: [ TP ]
    Supported link modes:   1000baseT/Full
    Supported pause frame use: No
    Supports auto-negotiation: Yes
    Advertised link modes:  1000baseT/Full
    Advertised pause frame use: No
    Advertised auto-negotiation: Yes
    Speed: 1000Mb/s
    Duplex: Full
    Port: Twisted Pair
    PHYAD: 0
    Transceiver: internal
    Auto-negotiation: on
    Link detected: yes
EOT
else
  /usr/sbin/ethtool "$@"
fi
EOF

sudo chmod +x /usr/local/bin/ethtool
hash -r