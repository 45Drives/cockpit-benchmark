FROM ubuntu:focal

LABEL author="Dawson Della Valle" \
	  maintainer="ddellavalle@45drives.com" \
	  description="Build .deb binaries for ubuntu"

USER root:root

RUN mkdir -p /home/deb/build

WORKDIR /home/deb/build

ENV TZ=America/Glace_Bay
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt update
RUN apt install -y \
	make build-essential fakeroot \
	devscripts debhelper

COPY entrypoint.sh /entrypoint.sh