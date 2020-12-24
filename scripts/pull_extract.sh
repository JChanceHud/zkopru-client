#!/bin/sh

set -e

IMAGE_NAME="zkoprunet/circuits:feat-113"

if [ -d ./keys ]
then
  exit
fi

docker pull $IMAGE_NAME

exec node $(pwd)/scripts/load_keys $IMAGE_NAME
