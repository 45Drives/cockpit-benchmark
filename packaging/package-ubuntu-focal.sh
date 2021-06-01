#!/bin/bash

PACKAGE_NAME=cockpit-benchmark

command -v docker > /dev/null 2>&1 || {
	echo "Please install docker.";
	exit 1;
}

dir=$(pwd)

function create_image() {
	cd $dir/docker/ubuntu-focal

	docker build -t $PACKAGE_NAME-ubuntu-builder .

	res=$?

	if [ $res -ne 0 ]; then
		echo "Building docker image failed."
		exit $res
	fi
}

if [[ "$(docker images -q $PACKAGE_NAME-ubuntu-builder 2> /dev/null)" == "" ]]; then
	create_image

	cd $dir
fi

mkdir -p dist/ubuntu

docker run -it --rm \
	-v "$dir:/home/deb/build" -v "$dir/dist/ubuntu:/home/deb" \
	$PACKAGE_NAME-ubuntu-builder /entrypoint.sh