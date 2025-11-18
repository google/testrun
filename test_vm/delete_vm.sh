#!/bin/sh

echo "Stopping and removing all Vagrant machines..."
# Destroy all Vagrant VMs found in global status
vagrant global-status --prune | awk '/libvirt|virtualbox/ {print $1}' | while read id; do
  vagrant destroy -f "$id"
done

echo "Removing all Vagrant boxes..."
# Remove all Vagrant boxes
vagrant box list | awk '{print $1}' | while read box; do
  vagrant box remove -f "$box"
done

echo "Removing all Vagrant plugins..."
# Uninstall all Vagrant plugins
vagrant plugin list | awk '{print $1}' | while read plugin; do
  vagrant plugin uninstall "$plugin"
done

echo "Deleting Vagrant settings and cache..."
# Remove Vagrant configuration and cache directory
rm -rf ~/.vagrant.d

echo "Uninstalling Vagrant..."
# Remove Vagrant package
sudo apt-get remove --purge -y vagrant || sudo dpkg -r vagrant

echo "Removing all libvirt virtual machines..."
# Destroy and undefine all libvirt VMs
sudo virsh list --all | awk 'NR>2 {print $2}' | while read vm; do
  sudo virsh destroy "$vm"
  sudo virsh undefine "$vm" --remove-all-storage
done

echo "Removing all libvirt networks..."
# Destroy and undefine all libvirt networks
sudo virsh net-list --all | awk 'NR>2 {print $1}' | while read net; do
  sudo virsh net-destroy "$net"
  sudo virsh net-undefine "$net"
done

echo "Removing all libvirt storage volumes..."
# Delete all storage volumes in the default pool
sudo virsh vol-list default | awk 'NR>2 {print $1}' | while read vol; do
  sudo virsh vol-delete "$vol" default
done

echo "Uninstalling libvirt and related packages..."
# Remove libvirt and related packages
sudo apt-get remove --purge -y libvirt-daemon-system libvirt-clients libvirt-dev qemu qemu-kvm bridge-utils virt-manager
sudo apt-get autoremove --purge -y

echo "Deleting libvirt configs and storage directories..."
# Remove libvirt configuration and storage directories
sudo rm -rf /etc/libvirt
sudo rm -rf /var/lib/libvirt
sudo rm -rf /var/run/libvirt

echo "Done! It is recommended to reboot your system."
