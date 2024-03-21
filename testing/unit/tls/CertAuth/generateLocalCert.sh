#!/bin/bash

# Helper script to generate the local certificate 
# used for unit testing. This script should be run
# directly from the directory where it lives for
# proper CA certificate resolving during signing process

CA_ROOT_CERT_NAME="Testrun_CA_Root"
CA_ROOT_DIR="."
CA_ROOT_KEY=$CA_ROOT_DIR/$CA_ROOT_CERT_NAME.key
CA_ROOT_CERT=$CA_ROOT_DIR/$CA_ROOT_CERT_NAME.crt


CERT_NAME="device_cert_local"

#Generate the private key
openssl genrsa -out $CERT_NAME.key 2048

#Generate the CSR
openssl req -new -key $CERT_NAME.key -out $CERT_NAME.csr -subj "/C=US/ST=California/L=MountainView/O=Testrun/OU=Qualification/CN=$CERT_NAME"

#Generate and sign the certificate with the local CA
openssl x509 -req -days 1826 -in $CERT_NAME.csr -CA $CA_ROOT_CERT -CAkey $CA_ROOT_KEY -CAcreateserial -out $CERT_NAME.crt

cp  $CERT_NAME.crt ../certs