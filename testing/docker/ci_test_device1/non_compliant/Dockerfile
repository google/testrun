
FROM ubuntu@sha256:e6173d4dc55e76b87c4af8db8821b1feae4146dd47341e4d431118c7dd060a74

ENV DEBIAN_FRONTEND=noninteractive

# Update and get all additional requirements not contained in the base image
RUN apt-get update && apt-get -y upgrade

RUN apt-get update && apt-get install -y isc-dhcp-client ntpdate coreutils moreutils inetutils-ping curl jq dnsutils openssl netcat-openbsd arping openssh-server

COPY entrypoint.sh /entrypoint.sh

# Expose the SSH port
EXPOSE 22

ENTRYPOINT ["/entrypoint.sh"]