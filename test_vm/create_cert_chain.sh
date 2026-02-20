#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <VM_IP>"
  exit 1
fi

VM_USER=vagrant
VM_PASS=vagrant
VM_IP="$1"
SSHPASS="sshpass -p $VM_PASS"

BASE_DIR="$(pwd)"
WORKDIR="$BASE_DIR/multi_ca_demo"
CERTS_DIR="$BASE_DIR/certs"
NGINX_CN="$VM_IP"

mkdir -p "$WORKDIR"
mkdir -p "$CERTS_DIR"
cd "$WORKDIR"

# Create CA extension configs for each CA
cat > root_ca_ext.cnf <<EOF
[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints = critical,CA:true,pathlen:2
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOF

cat > int1_ca_ext.cnf <<EOF
[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints = critical,CA:true,pathlen:1
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOF

cat > int2_ca_ext.cnf <<EOF
[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints = critical,CA:true,pathlen:0
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOF

# 1. Root CA
openssl genrsa -out rootCA.key 4096
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 -out rootCA.pem -subj "/C=RU/O=MyOrgRoot/CN=MyRootCA" -extensions v3_ca -config root_ca_ext.cnf

# 2. Intermediate CA 1
openssl genrsa -out int1CA.key 4096
openssl req -new -key int1CA.key -out int1CA.csr -subj "/C=RU/O=MyOrgInt1/CN=MyInt1CA"
openssl x509 -req -in int1CA.csr -CA rootCA.pem -CAkey rootCA.key -CAcreateserial \
  -out int1CA.pem -days 1825 -sha256 -extfile int1_ca_ext.cnf -extensions v3_ca

# 3. Intermediate CA 2
openssl genrsa -out int2CA.key 4096
openssl req -new -key int2CA.key -out int2CA.csr -subj "/C=RU/O=MyOrgInt2/CN=MyInt2CA"
openssl x509 -req -in int2CA.csr -CA int1CA.pem -CAkey int1CA.key -CAcreateserial \
  -out int2CA.pem -days 1825 -sha256 -extfile int2_ca_ext.cnf -extensions v3_ca

# 4. nginx server key and CSR
cat > openssl_nginx.cnf <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
C  = RU
O  = MyOrganization
CN = $NGINX_CN

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
IP.1 = $NGINX_CN
EOF

openssl req -new -nodes -out nginx.csr -newkey rsa:2048 -keyout nginx.key -config openssl_nginx.cnf

# 5. nginx server cert signed by Intermediate CA 2
openssl x509 -req -in nginx.csr -CA int2CA.pem -CAkey int2CA.key -CAcreateserial \
  -out nginx.crt -days 365 -sha256 -extfile openssl_nginx.cnf -extensions req_ext

# 6. Build full chain for nginx
cat nginx.crt int2CA.pem int1CA.pem rootCA.pem > nginx_fullchain.pem

echo "All certificates generated."

# 7. Copy certs and key to VM
$SSHPASS scp -o StrictHostKeyChecking=no nginx.key ${VM_USER}@${VM_IP}:/home/vagrant/nginx.key
$SSHPASS scp -o StrictHostKeyChecking=no nginx_fullchain.pem ${VM_USER}@${VM_IP}:/home/vagrant/nginx_fullchain.pem
$SSHPASS scp -o StrictHostKeyChecking=no int2CA.pem ${VM_USER}@${VM_IP}:/home/vagrant/int2CA.pem
$SSHPASS scp -o StrictHostKeyChecking=no int1CA.pem ${VM_USER}@${VM_IP}:/home/vagrant/int1CA.pem
$SSHPASS scp -o StrictHostKeyChecking=no rootCA.pem ${VM_USER}@${VM_IP}:/home/vagrant/rootCA.pem

# 8. Move certs to correct locations and configure nginx on VM
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo mv /home/vagrant/nginx.key /etc/ssl/private/nginx.key"
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo mv /home/vagrant/nginx_fullchain.pem /etc/ssl/certs/nginx_fullchain.pem"
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo mv /home/vagrant/int2CA.pem /etc/ssl/certs/int2CA.pem"
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo mv /home/vagrant/int1CA.pem /etc/ssl/certs/int1CA.pem"
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo mv /home/vagrant/rootCA.pem /etc/ssl/certs/rootCA.pem"

$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo bash -c 'cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 443 ssl;
    server_name $NGINX_CN;

    ssl_certificate /etc/ssl/certs/nginx_fullchain.pem;
    ssl_certificate_key /etc/ssl/private/nginx.key;

    location / {
        root /var/www/html;
        index index.html index.htm;
    }
}
EOF
'"

$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo nginx -t"
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo systemctl restart nginx"

echo "nginx configured with multi-level CA chain on $VM_IP"

# 9. Copy nginx_fullchain.pem, int2CA.pem, int1CA.pem, rootCA.pem from VM to certs subdirectory in working directory
# $SSHPASS scp -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP}:/etc/ssl/certs/nginx_fullchain.pem "$CERTS_DIR/nginx_fullchain.pem"
$SSHPASS scp -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP}:/etc/ssl/certs/int2CA.pem "$CERTS_DIR/int2CA.pem"
$SSHPASS scp -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP}:/etc/ssl/certs/int1CA.pem "$CERTS_DIR/int1CA.pem"
$SSHPASS scp -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP}:/etc/ssl/certs/rootCA.pem "$CERTS_DIR/rootCA.pem"
echo "Certificates copied from VM to $CERTS_DIR/"

# 10. Add rootCA.pem to trusted store on the client (Ubuntu/Debian)
if [ -f "$CERTS_DIR/rootCA.pem" ]; then
  echo "Adding rootCA.pem to trusted store..."
  sudo cp "$CERTS_DIR/rootCA.pem" /usr/local/share/ca-certificates/myorg-root-ca.crt
  sudo update-ca-certificates
  echo "rootCA.pem added to trusted store."
else
  echo "rootCA.pem not found in $CERTS_DIR, skipping trusted store update."
fi

# 11. Remove temporary working directory
cd "$BASE_DIR"
rm -rf "$WORKDIR"
echo "Temporary directory $WORKDIR removed."