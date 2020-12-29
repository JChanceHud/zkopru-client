#!/bin/sh

set -e

node scripts/create_account

if [ ! -d data ]
then
  mkdir data
fi

KEYS_PIN_CID=QmZWPNTt72gF7f45wDDC3DaaXnsNConr7Yid4Fde1znt3w
if [ ! -d data/keys ]
then
  wget "http://zkopru.rollupsync.com:8080/api/v0/get?arg=$KEYS_PIN_CID&archive=true&compress=true" -O data/keys.tar.gz
  tar -zxf data/keys.tar.gz
  mv $KEYS_PIN_CID data/keys
  rm data/keys.tar.gz
fi

exec docker-compose up --build -d $@
