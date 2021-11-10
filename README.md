# Proof of Concept

- First, start containers (geth, db). There is no retry feature so we must wait for a while to sync blockchain data then start the application

## Environment

node: v16.13.0

## RUN

```
chmod +x entry-point.sh
docker-compose up -d
./entry-point.sh
```
