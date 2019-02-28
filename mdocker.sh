#!/bin/bash
IMAGE_NAME="docker.atl-paas.net/dp-models"
case "${1}" in
	build)
		docker build -t "${IMAGE_NAME}" . ;;
	push)
		docker push "${IMAGE_NAME}" ;;
	run)
		docker run -dit -p 8080:8080 --name dp-models "${IMAGE_NAME}" ;;
	stop)
		docker rm -f dp-models
esac