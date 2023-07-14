#!/bin/bash

ip a

declare -A options
for option in $*; do
    if [[ $option == *"="* ]]; then
        k=$(echo $option | cut -d'=' -f1)
        v=$(echo $option | cut -d'=' -f2)
        options[$k]=$v
    else
        options[$option]=$option
    fi
done

OUT=/out/testrun_ci.json

NTP_SERVER=10.10.10.5
DNS_SERVER=10.10.10.4

function wout(){
    temp=${1//./\".\"}
    key=${temp:1}\"
    echo $key
    value=$2
    jq "$key+=\"$value\"" $OUT | sponge $OUT
}


dig @8.8.8.8 +short www.google.com

# DHCP
ip addr flush dev eth0
PID_FILE=/var/run/dhclient.pid
if [ -f $PID_FILE ]; then
    kill -9 $(cat $PID_FILE) || true
    rm -f $PID_FILE
fi
dhclient -v eth0


if [ -n "${options[oddservices]}" ]; then
    echo Running services on non standard ports and open default ports 

    echo Starting FTP 21514 and open default 20,21
    nc -nvlt -p 20 &
    nc -nvlt -p 21 &
    (while true; do echo -e "220 ProFTPD 1.3.5e Server (Debian) $(hostname)" | nc -l -w 1 21514; done) &
    
    echo Starting SMTP 1256 and open default 25, 465, 587
    nc -nvlt -p 25 &
    nc -nvlt -p 465 &
    nc -nvlt -p 587 &
    (while true; do echo -e "220 $(hostname) ESMTP Postfix (Ubuntu)" | nc -l -w 1 1256; done) &

    echo Starting IMAP 5361 and open default ports 143, 993
    nc -nvlt -p 143 &
    nc -nvlt -p 993 &
    (while true; do echo -e "* OK [CAPABILITY IMAP4rev1 LITERAL+ SASL-IR LOGIN-REFERRALS ID ENABLE IDLE STARTTLS AUTH=PLAIN] Dovecot (Ubuntu) ready.\r\n" \
        | nc -l -w 1 5361; done) &

    echo Starting POP3 23451 and open default 110, 995
    nc -nvlt -p 110 &
    nc -nvlt -p 995 &
    (while true; do echo -ne "+OK POP3 Server ready\r\n" | nc -l -w 1 23451; done) &

    echo starting TFTP UDP 69
    (while true; do echo -ne "\0\x05\0\0\x07\0" | nc -u -l -w 1 69; done) &

fi

if [ -n "${options[snmp]}" ]; then
    echo starting mock none snmpv3 on port UDP 161
    (while true; do echo -ne " \x02\x01\ " | nc -u -l -w 1 161; done) &
fi

if [ -n "${options[snmpv3]}" ]; then
    echo starting mock SNMPv3 UDP 161
    (while true; do echo -ne "  \x02\x01\x030 \x02\x02Ji\x02    \x04\x01 \x02\x01\x03\x04" | nc -u -l -w 1 161; done) &
fi

if [ -n "${options[ssh]}" ]; then
    echo Starting SSH server
    /usr/local/sbin/sshd
elif [ -n "${options[sshv1]}" ]; then
    echo Starting SSHv1 server
    echo 'Protocol 1' >> /usr/local/etc/sshd_config
    /usr/local/sbin/sshd
fi

# still testing - using fixed 
if [ -n "${options[ntpv4_dhcp]}"]; then
    (while true; do
        dhcp_ntp=$(fgrep NTPSERVERS= /run/ntpdate.dhcp)
        if [ -n "${dhcp_ntp}" ]; then
            ntp_server=`echo $dhcp_ntp | cut -d "'" -f 2`
            echo NTP server from DHCP $ntp_server
        fi
        ntpdate -q -p 1 $ntp_server
        sleep 5
     done) &
fi

if [ -n "${options[ntpv3_time_google_com]}"]; then
    (while true; do
        ntpdate -q -p 1 -o 3 time.google.com
        sleep 5
     done) &
fi

tail -f /dev/null