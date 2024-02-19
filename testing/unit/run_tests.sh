#!/bin/bash -e

# This script should be run from within the unit_test directory.  If
# it is run outside this directory, paths will not be resolved correctly.

# Move into the root directory of test-run
pushd ../../ >/dev/null 2>&1

echo "Root Dir: $PWD"

# Add the framework sources
PYTHONPATH="$PWD/framework/python/src:$PWD/framework/python/src/common"
# Add the test module sources
PYTHONPATH="$PYTHONPATH:$PWD/modules/test/base/python/src"
PYTHONPATH="$PYTHONPATH:$PWD/modules/test/tls/python/src"
PYTHONPATH="$PYTHONPATH:$PWD/modules/test/dns/python/src"
PYTHONPATH="$PYTHONPATH:$PWD/modules/test/nmap/python/src"
PYTHONPATH="$PYTHONPATH:$PWD/modules/test/ntp/python/src"
# Set the python path with all sources
export PYTHONPATH

# Run the DHCP Unit tests
python3 -u $PWD/modules/network/dhcp-1/python/src/grpc_server/dhcp_config_test.py
python3 -u $PWD/modules/network/dhcp-2/python/src/grpc_server/dhcp_config_test.py

# Run the TLS Module Unit Tests
python3 -u $PWD/testing/unit/tls/tls_module_test.py

# Run the DNS Module Unit Tests
python3 -u $PWD/testing/unit/dns/dns_module_test.py

# Run the NMAP Module Unit Tests
python3 -u $PWD/testing/unit/nmap/nmap_module_test.py

# Run the Report Unit Tests
python3 -u $PWD/testing/unit/report/report_test.py

# Run the NMAP Module Unit Tests
python3 -u $PWD/testing/unit/ntp/ntp_module_test.py


popd >/dev/null 2>&1