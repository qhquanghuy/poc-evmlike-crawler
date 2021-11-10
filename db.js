import dotenv from 'dotenv'
dotenv.config()


import mysql from 'mysql2'
import { require } from './functions.js'


const dbConf = require('./database.json')

const connection = (() => {
    const conf = dbConf[dbConf.defaultEnv]
    return mysql.createConnection({
        host: conf.host,
        user: conf.user,
        database: conf.database,
        password: process.env[conf.password.ENV],
        port: conf.port
    });
})()

export { connection }