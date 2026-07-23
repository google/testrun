#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <VM_IP>"
  exit 1
fi

if [ "$EUID" -eq 0 ]; then
  echo "Please run this script as a normal user, not with sudo."
  echo "The script uses Vagrant SSH and only escalates the necessary host operations when required."
  exit 1
fi

# Save the initial working directory
WORKDIR="$(pwd)"

if ! command -v vagrant >/dev/null 2>&1; then
  echo "Error: vagrant command not found. Please install Vagrant and run this script from the test_vm folder."
  exit 1
fi

VM_IP="$1"
CA_DIR=~/myCA

SSH_CONFIG_FILE="$(mktemp)"
trap 'rm -f "$SSH_CONFIG_FILE"' EXIT

if ! vagrant ssh-config > "$SSH_CONFIG_FILE" 2>/dev/null; then
  echo "Error: failed to generate Vagrant SSH config. Run this script in a valid Vagrant VM directory."
  exit 1
fi

SSH_HOST="$(grep -E '^Host ' "$SSH_CONFIG_FILE" | awk '{print $2}' | head -n1)"
if [ -z "$SSH_HOST" ]; then
  echo "Error: could not determine Vagrant SSH host from ssh-config."
  exit 1
fi

SSH_CMD=(ssh -F "$SSH_CONFIG_FILE" -o StrictHostKeyChecking=no)
SCP_CMD=(scp -F "$SSH_CONFIG_FILE" -o StrictHostKeyChecking=no)

# 1. Generate key and CSR on VM via Vagrant SSH
"${SSH_CMD[@]}" "$SSH_HOST" "cat > /home/vagrant/openssl_ip.cnf" <<EOF
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

"${SSH_CMD[@]}" "$SSH_HOST" "openssl req -new -nodes -out /home/vagrant/nginx_ip.csr -newkey rsa:2048 -keyout /home/vagrant/nginx_ip.key -config /home/vagrant/openssl_ip.cnf"

# 2. Copy CSR and config from VM to host (current directory)
"${SCP_CMD[@]}" "$SSH_HOST":/home/vagrant/nginx_ip.csr "$WORKDIR/"
"${SCP_CMD[@]}" "$SSH_HOST":/home/vagrant/openssl_ip.cnf "$WORKDIR/"

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
"${SCP_CMD[@]}" nginx_ip.crt "$SSH_HOST":/home/vagrant/
"${SCP_CMD[@]}" myorgca.pem "$SSH_HOST":/home/vagrant/

# 6. Copy myorgca.pem to initial working directory on host (if not already there)
if [ "$WORKDIR" != "$CA_DIR" ]; then
  cp "$CA_DIR/myorgca.pem" "$WORKDIR/myorgca.pem"
fi

# 7. Move certificates and configure nginx for SSL on VM
"${SSH_CMD[@]}" "$SSH_HOST" "sudo mv /home/vagrant/nginx_ip.crt /etc/ssl/certs/nginx_ip.crt"
"${SSH_CMD[@]}" "$SSH_HOST" "sudo mv /home/vagrant/nginx_ip.key /etc/ssl/private/nginx_ip.key"
"${SSH_CMD[@]}" "$SSH_HOST" "sudo mv /home/vagrant/myorgca.pem /etc/ssl/certs/myorgca.pem"

"${SSH_CMD[@]}" "$SSH_HOST" "sudo bash -c 'cat > /etc/nginx/sites-available/default <<EOF
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

"${SSH_CMD[@]}" "$SSH_HOST" "sudo nginx -t"
"${SSH_CMD[@]}" "$SSH_HOST" "sudo systemctl restart nginx"

echo "SSL certificate installed and nginx restarted on ${VM_IP}"
if [ "$WORKDIR" != "$CA_DIR" ]; then
  echo "CA certificate (myorgca.pem) copied to $WORKDIR/myorgca.pem"
else
  echo "CA certificate (myorgca.pem) is already in $WORKDIR"
fi

# 8. Copy nginx_ip.crt from VM to certs subdirectory in initial working directory
CERTS_DIR="$WORKDIR/certs"
mkdir -p "$CERTS_DIR"
"${SCP_CMD[@]}" "$SSH_HOST":/etc/ssl/certs/myorgca.pem "$CERTS_DIR/myorgca.pem"
echo "myorgca.pem copied from VM to $CERTS_DIR/myorgca.pem"

# 9. Add myorgca.pem to trusted store on the client (Ubuntu/Debian)
if [ -f "$CERTS_DIR/myorgca.pem" ]; then
  echo "Adding myorgca.pem to trusted store..."
  sudo cp "$CERTS_DIR/myorgca.pem" /usr/local/share/ca-certificates/myorgca.crt
  sudo update-ca-certificates
  echo "myorgca.pem added to trusted store."
else
  echo "myorgca.pem not found in $CERTS_DIR, skipping trusted store update."
fi