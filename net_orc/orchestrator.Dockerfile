# Image name: test-run/orchestrator
FROM test-run/base:latest

#Update and get all additional requirements not contained in the base image
RUN apt-get update

RUN apt-get install -y python3-pip curl openvswitch-switch

#Download and install docker client 
ENV DOCKERVERSION=20.10.2
RUN curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKERVERSION}.tgz \
  && tar xzvf docker-${DOCKERVERSION}.tgz --strip 1 -C /usr/local/bin docker/docker \
  && rm docker-${DOCKERVERSION}.tgz

#Create a directory to load all the app files into
RUN mkdir /python

#Load the requirements file
COPY python/requirements.txt /python

#Install all python requirements for the module
RUN pip3 install -r python/requirements.txt
