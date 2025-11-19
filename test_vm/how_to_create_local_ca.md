## 1. On the Host: Create Your Own CA

```bash
mkdir ~/myCA
cd ~/myCA
openssl genrsa -out myorgca.key 4096
openssl req -x509 -new -nodes -key myorgca.key -sha256 -days 1825 -out myorgca.pem -subj "/C=RU/O=MyOrganization/CN=MyOrgCA"
```

Here, O=MyOrganization is the Organization Name for your CA.

## 2. On the VM: Create a Key, CSR, and Config with SAN and Organization Name

### On the VM:

Create a file named openssl_ip.cnf:

```ini
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
C  = RU
O  = MyOrganization
CN = 10.10.10.14

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
IP.1 = 10.10.10.14
```

Generate the key and CSR:

```bash
openssl req -new -nodes -out nginx_ip.csr -newkey rsa:2048 -keyout nginx_ip.key -config openssl_ip.cnf
```

## 3. Copy the CSR and Config from the VM to the Host

### On the host:

```bash
scp vagrant@<vm ip>/home/vagrant/nginx_ip.csr ~/myCA/
scp vagrant@<vm ip>:/home/vagrant/openssl_ip.cnf ~/myCA/
```

## 4. On the Host: Sign the Certificate with Your CA

```bash
cd ~/myCA
openssl x509 -req -in nginx_ip.csr -CA myorgca.pem -CAkey myorgca.key -CAcreateserial -out nginx_ip.crt -days 365 -sha256 -extfile openssl_ip.cnf -extensions req_ext
```

## 5. Copy the Certificate and CA Back to the VM

### On the host:

```bash
scp ~/myCA/nginx_ip.crt vagrant@<vm ip>:/home/vagrant/
scp ~/myCA/nginx_ip.key vagrant@<vm ip>:/home/vagrant/
scp ~/myCA/myorgca.pem vagrant@<vm ip>:/home/vagrant/
```

## 6. On the VM: Install nginx and Configure the Certificate

```bash
sudo apt update
sudo apt install nginx
sudo mv nginx_ip.crt /etc/ssl/certs/
sudo mv nginx_ip.key /etc/ssl/private/
sudo mv myorgca.pem /etc/ssl/certs/
```

### Edit /etc/nginx/sites-available/default and add/replace the server block:

```nginx

server {
    listen 443 ssl;
    server_name 192.168.121.234;

    ssl_certificate /etc/ssl/certs/nginx_ip.crt;
    ssl_certificate_key /etc/ssl/private/nginx_ip.key;
    ssl_trusted_certificate /etc/ssl/certs/myorgca.pem;

    location / {
        root /var/www/html;
        index index.html index.htm;
    }
}
```

### Test the config:

```bash
sudo nginx -t
Restart nginx:
```

```bash
sudo systemctl restart nginx
```

## 7. On the host: Add the CA to the Trusted Store

### On the host:

```bash
cp ~/myCA/myorgca.pem ~/myCA/myorgca.crt
sudo cp ~/myCA/myorgca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

You should see:


Adding debian:myorgca.crt
