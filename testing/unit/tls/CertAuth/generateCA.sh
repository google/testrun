#!/bin/bash

#Generate new unencrypted private key
openssl genrsa -out Testrun_CA_Root.key 2048

#Generate a new csr.
openssl req -new -key Testrun_CA_Root.key -out Testrun_CA_Root.csr -subj "/C=US/ST=California/L=MountainView/O=Testrun/OU=Qualification/CN=Testrun RSA Signing CA"

#Generate and self sign the CA cert
openssl x509 -req -days 3652 -in Testrun_CA_Root.csr -signkey Testrun_CA_Root.key -sha256 -out Testrun_CA_Root.crt

#Copy the generated cirt to the local root_certs directory
cp  Testrun_CA_Root.crt ../root_certs