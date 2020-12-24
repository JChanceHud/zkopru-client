#!/bin/sh

set -e

yes | prisma migrate up --experimental --schema /zkopru/packages/prisma/prisma/postgres-migrator.prisma --verbose

exec node /zkopru/packages/cli/dist/apps/coordinator/cli.js --config /coordinator.rinkeby.json
