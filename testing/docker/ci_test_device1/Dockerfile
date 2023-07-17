
FROM ubuntu:jammy
ENV DEBIAN_FRONTEND=noninteractive 
#Update and get all additional requirements not contained in the base image 
RUN apt-get update && apt-get -y upgrade

RUN apt-get update && apt-get install -y isc-dhcp-client ntpdate coreutils moreutils inetutils-ping curl jq dnsutils openssl netcat-openbsd 

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]