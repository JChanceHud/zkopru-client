#!/bin/sh

set -e

node scripts/create_account
node scripts/create_wallet

# get the keys
if [ ! -d ./keys ]
then
  docker pull $IMAGE_NAME
  node scripts/load_keys $IMAGE_NAME
fi

if [ ! -d data ]
then
  mkdir data
fi

exec docker-compose up --build $@
