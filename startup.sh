#!/bin/bash


docker-compose up -d db
# docker-compose up -d geth

sleep 20s

docker-compose up -d