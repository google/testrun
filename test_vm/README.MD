# Complete Step-by-Step Guide: Vagrant + libvirt + Manual DHCP

This guide will help you set up a Vagrant VM with two network interfaces:
- **First interface:** NAT (default, for SSH access)
- **Second interface:** Directly connected to the host via an isolated bridge (e.g., enbr99), does not get an IP automatically, and will only receive an IP from your custom DHCP server running in Docker on the host.

---

## 1. Install Required Packages and Dependencies



```bash
sudo wget -O- https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo add-apt-repository -y "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update
sudo apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils \
                        ruby ruby-dev libvirt-dev zlib1g-dev ebtables dnsmasq-base vagrant ansible

```

## 2. Add Your User to the libvirt Group

```bash
sudo usermod -aG libvirt $(whoami)
newgrp libvirt
```

Note: After adding yourself to the libvirt group, restart your session or use newgrp libvirt for the permissions to take effect.


## 3. Check and Start libvirt Service

```bash
systemctl status libvirtd
sudo systemctl start libvirtd
```

## 4. Install the vagrant-libvirt Plugin

```bash
vagrant plugin install vagrant-libvirt
```

## 5. Remove Old Bridge (enbr99) If It Exists

```bash
ip link show enbr99
sudo ip link delete enbr99 type bridge
```

## 6. Create an Isolated libvirt Network Without IP and DHCP

### Create the file /tmp/hostonly-noip.xml

```bash 
nano /tmp/hostonly-noip.xml
```

file content

```xml
<network>
  <name>hostonly-noip</name>
  <forward mode='none'/>
  <bridge name='enbr99' stp='off' delay='0'/>
</network>
```

### Create and start the network:

```bash
sudo virsh net-destroy hostonly-noip || true
sudo virsh net-undefine hostonly-noip || true
sudo virsh net-define /tmp/hostonly-noip.xml
sudo virsh net-start hostonly-noip
sudo virsh net-autostart hostonly-noip
```

## 7. Verify the Network is Active

```bash
sudo virsh net-list --all
```

You should see hostonly-noip with status active.


## 8. Start the Virtual Machine

COMPLIANT DEVICE

```bash
./mock_ethtool.sh
hash -r
DEVICE=COMPLIANT vagrant up --provider=libvirt
DEVICE=COMPLIANT vagrant provision
./create_certificate.sh <VM IP>
```


NON-COMPLIANT DEVICE (WITHOUT TLS)

```bash
./restore_ethtool.sh
hash -r
DEVICE=NON-COMPLIANT vagrant up --provider=libvirt
DEVICE=NON-COMPLIANT vagrant provision
```

NON-COMPLIANT DEVICE (TLS ONLY)

```bash
./restore_ethtool.sh
hash -r
DEVICE=NON-COMPLIANT-TLS vagrant up --provider=libvirt
DEVICE=NON-COMPLIANT-TLS vagrant provision
```

NOT-DETECTED DEVICE 

```bash
./mock_ethtool.sh
hash -r
DEVICE=NOT-DETECTED vagrant up --provider=libvirt
DEVICE=NOT-DETECTED vagrant provision
```

If you see "Permission denied to /var/run/libvirt/libvirt-sock", check your libvirt group membership and restart your session.


## 9. Start Testrun

