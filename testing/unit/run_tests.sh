#!/bin/bash -e

# This script should be run from within the unit_test directory.  If
# it is run outside this directory, paths will not be resolved correctly.

# Move into the root directory of test-run
pushd ../../ >/dev/null 2>&1

echo "Root Dir: $PWD"

# Setup the python path 
export PYTHONPATH="$PWD/framework/python/src:$PWD/modules/test/base/python/src:$PWD/framework/python/src/common"
export PYTHONPATH="$PYTHONPATH:$PWD/modules/test/nmap/python/src"

# # Run the DHCP Unit tests
# python3 -u $PWD/modules/network/dhcp-1/python/src/grpc_server/dhcp_config_test.py
# python3 -u $PWD/modules/network/dhcp-2/python/src/grpc_server/dhcp_config_test.py

# # Run the Security Module Unit Tests
# python3 -u $PWD/modules/test/tls/python/src/tls_module_test.py

# Run the DNS Module Unit Tests
#python3 -u $PWD/modules/test/dns/python/src/dns_module_test.py

# Run the NMAP Module Unit Tests
python3 -u $PWD/modules/test/nmap/python/src/nmap_module_test.py

python3 -u $PWD/testing/unit/report/report_test.py


popd >/dev/null 2>&1