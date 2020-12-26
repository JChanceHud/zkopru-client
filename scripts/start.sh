#!/bin/sh

set -e

node scripts/create_account

# get the keys
if [ ! -d ./keys ]
then
  docker pull $IMAGE_NAME
  node scripts/load_keys $IMAGE_NAME
fi

exec docker-compose up --build $@
