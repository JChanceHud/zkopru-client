#!/bin/sh

set -e

node scripts/create_account

if [ ! -d data ]
then
  mkdir data
fi

exec docker-compose up --build -d $@
