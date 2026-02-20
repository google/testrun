#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <VM_IP>"
  exit 1
fi

# Save the initial working directory
WORKDIR="$(pwd)"

# Check and install sshpass if not present
if ! command -v sshpass &> /dev/null; then
  echo "sshpass not found. Installing..."
  if [ -x "$(command -v apt)" ]; then
    sudo apt update
    sudo apt install -y sshpass
  elif [ -x "$(command -v yum)" ]; then
    sudo yum install -y epel-release
    sudo yum install -y sshpass
  elif [ -x "$(command -v brew)" ]; then
    brew install hudochenkov/sshpass/sshpass
  else
    echo "Please install sshpass manually."
    exit 1
  fi
fi

VM_USER=vagrant
VM_PASS=vagrant
VM_IP="$1"
CA_DIR=~/myCA

SSHPASS="sshpass -p $VM_PASS"

# 1. Generate key and CSR on VM via ssh
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "cat > /home/vagrant/openssl_ip.cnf" <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
C  = RU
O  = MyOrganization
CN = ${VM_IP}

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
IP.1 = ${VM_IP}
EOF

$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "openssl req -new -nodes -out /home/vagrant/nginx_ip.csr -newkey rsa:2048 -keyout /home/vagrant/nginx_ip.key -config /home/vagrant/openssl_ip.cnf"

# 2. Copy CSR and config from VM to host (current directory)
$SSHPASS scp -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP}:/home/vagrant/nginx_ip.csr "$WORKDIR/"
$SSHPASS scp -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP}:/home/vagrant/openssl_ip.cnf "$WORKDIR/"

CSR_PATH="$WORKDIR/nginx_ip.csr"
CONF_PATH="$WORKDIR/openssl_ip.cnf"

# 3. Create CA (once)
mkdir -p "$CA_DIR"
cd "$CA_DIR"
if [ ! -f myorgca.key ]; then
  openssl genrsa -out myorgca.key 4096
fi
if [ ! -f myorgca.pem ]; then
  openssl req -x509 -new -nodes -key myorgca.key -sha256 -days 1825 -out myorgca.pem -subj "/C=RU/O=MyOrganization/CN=MyOrgCA"
fi

# 4. Sign the certificate using absolute paths
openssl x509 -req -in "$CSR_PATH" -CA myorgca.pem -CAkey myorgca.key -CAcreateserial -out nginx_ip.crt -days 365 -sha256 -extfile "$CONF_PATH" -extensions req_ext

# 5. Copy certificate and CA back to VM
$SSHPASS scp -o StrictHostKeyChecking=no nginx_ip.crt ${VM_USER}@${VM_IP}:/home/vagrant/
$SSHPASS scp -o StrictHostKeyChecking=no myorgca.pem ${VM_USER}@${VM_IP}:/home/vagrant/

# 6. Copy myorgca.pem to initial working directory on host (if not already there)
if [ "$WORKDIR" != "$CA_DIR" ]; then
  cp "$CA_DIR/myorgca.pem" "$WORKDIR/myorgca.pem"
fi

# 7. Move certificates and configure nginx for SSL on VM
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo mv /home/vagrant/nginx_ip.crt /etc/ssl/certs/nginx_ip.crt"
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo mv /home/vagrant/nginx_ip.key /etc/ssl/private/nginx_ip.key"
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo mv /home/vagrant/myorgca.pem /etc/ssl/certs/myorgca.pem"

$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo bash -c 'cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 443 ssl;
    server_name ${VM_IP};

    ssl_certificate /etc/ssl/certs/nginx_ip.crt;
    ssl_certificate_key /etc/ssl/private/nginx_ip.key;
    ssl_trusted_certificate /etc/ssl/certs/myorgca.pem;

    location / {
        root /var/www/html;
        index index.html index.htm;
    }
}
EOF
'"

$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo nginx -t"
$SSHPASS ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} "sudo systemctl restart nginx"

echo "SSL certificate installed and nginx restarted on ${VM_IP}"
if [ "$WORKDIR" != "$CA_DIR" ]; then
  echo "CA certificate (myorgca.pem) copied to $WORKDIR/myorgca.pem"
else
  echo "CA certificate (myorgca.pem) is already in $WORKDIR"
fi

# 8. Copy nginx_ip.crt from VM to certs subdirectory in initial working directory
CERTS_DIR="$WORKDIR/certs"
mkdir -p "$CERTS_DIR"
$SSHPASS scp -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP}:/etc/ssl/certs/myorgca.pem "$CERTS_DIR/myorgca.pem"
echo "nginx_ip.crt copied from VM to $CERTS_DIR/nginx_ip.crt"

# 9. Add myorgca.pem to trusted store on the client (Ubuntu/Debian)
if [ -f "$CERTS_DIR/myorgca.pem" ]; then
  echo "Adding myorgca.pem to trusted store..."
  sudo cp "$CERTS_DIR/myorgca.pem" /usr/local/share/ca-certificates/myorgca.crt
  sudo update-ca-certificates
  echo "myorgca.pem added to trusted store."
else
  echo "myorgca.pem not found in $CERTS_DIR, skipping trusted store update."
fi