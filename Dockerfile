FROM node

RUN npm install

RUN ./node_modules/db-migrate/bin/db-migrate up


CMD ["node", "index.js"]