#!/bin/sh

set -e

while ! nc -z postgres 5432; do sleep 1; done;

yes | prisma migrate up --experimental --schema /zkopru/packages/prisma/prisma/postgres-migrator.prisma --verbose

exec gotty -w --port 1234 node /zkopru/packages/cli/dist/apps/coordinator/cli.js --config /coordinator.kovan.json
