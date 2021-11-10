#!/bin/bash



npm i
echo "Migration"
./node_modules/db-migrate/bin/db-migrate db:create test
./node_modules/db-migrate/bin/db-migrate up

node index.js