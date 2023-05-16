FROM ubuntu:jammy

#Update and get all additional requirements not contained in the base image 
RUN apt-get update && apt-get -y upgrade

RUN apt-get install -y isc-dhcp-client ntpdate coreutils moreutils inetutils-ping curl jq dnsutils

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]