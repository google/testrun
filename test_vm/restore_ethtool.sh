#!/bin/bash

echo "=== Removing mock ethtool from /usr/local/bin (if exists) ==="
if [ -f /usr/local/bin/ethtool ]; then
  sudo rm /usr/local/bin/ethtool
  echo "Mock ethtool removed."
else
  echo "No mock ethtool found in /usr/local/bin."
fi

echo "=== Resetting Bash command hash ==="
hash -r

echo "=== Checking which ethtool is now active ==="
which ethtool
type ethtool

echo "=== Testing ethtool enbr99 ==="
ethtool enbr99 || echo "If you see 'No such file or directory', open a new
 terminal and try again."

echo "=== Done! If you still see the mock error, open a new terminal or run 'hash -r' again. ==="