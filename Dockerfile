FROM node:16.13.0-alpine

WORKDIR /app

COPY . .

RUN chmod +x migrate.sh

RUN npm install


