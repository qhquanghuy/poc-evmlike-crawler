#!/bin/bash

./node_modules/db-migrate/bin/db-migrate db:create test
./node_modules/db-migrate/bin/db-migrate up