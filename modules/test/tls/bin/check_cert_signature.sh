#!/bin/bash

ROOT_CERT=$1
DEVICE_CERT=$2

echo "ROOT: $ROOT_CERT"
echo "DEVICE_CERT: $DEVICE_CERT"

response=$(openssl verify -CAfile $ROOT_CERT $DEVICE_CERT)

echo "$response"
