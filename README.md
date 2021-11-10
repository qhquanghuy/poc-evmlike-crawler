# Proof of Concept

- First, start containers (geth, db). There is no retry feature so we must wait for a while to sync blockchain data then start the application

## Disclaimer

- If application crashed (cannot get data from local chain because the chain is syncing and might not find the contract code), re-run it!

## Environment

node: v16.13.0

## RUN

```
docker-compose up -d
```

### Migration

```
./node_modules/db-migrate/bin/db-migrate db:create test
./node_modules/db-migrate/bin/db-migrate up
```

### Run

```
node index.js
```
