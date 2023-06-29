#!/bin/bash -e

export PYTHONPATH="$PWD/framework/python/src"
python3 -u modules/network/dhcp-1/python/src/grpc/dhcp_config_test.py
