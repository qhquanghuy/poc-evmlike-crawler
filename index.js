
require('dotenv').config()
const Web3 = require('web3')

const mysql = require('mysql2')
const dbConf = require('./database.json')

const tokens = require('./contracts/tokens.json')
const token_abi = {
    bep20: require('./contracts/bep20.json'),
    erc20: require('./contracts/erc20.json')
}

const pancakeswap = require('./contracts/pancakeswap.json')

const connection = (() => {
    const conf = dbConf[dbConf.defaultEnv]
    return mysql.createConnection({
        host: '127.0.0.1',
        user: conf.user,
        database: conf.database,
        password: process.env[conf.password.ENV],
        port: 33061
      });
})()


async function protocolInfoOf(token) {
    const web3 = new Web3(token.provider)
    const contract = new web3.eth.Contract(token_abi[token.abi], token.address)

    const name = await contract.methods.name().call()
    const symbol = await contract.methods.symbol().call()
    const decimals = await contract.methods.decimals().call()
    const totalSupply = await contract.methods.totalSupply().call()

    /**NOTE
     * []
     * Some info like creation date, version,etc might be collected manually or iterated the blockchain.
     * Blockchain data should be indexed in a database to extract those data.
     * Leave those null for now
     */
    return {
        name: name,
        symbol: symbol,
        totalSupply: totalSupply / (10 ** decimals),
    }
}

function quote(x) {
    return `'${x}'`
}


async function protocolInfo() {

    const promises = Object.keys(tokens)
        .map(k => {
            return protocolInfoOf(tokens[k])
        })

    const xs = await Promise.all(promises)
    const sqlValues = xs
        .map(x => [quote(x.name), quote(x.symbol), quote(x.symbol), quote(x.totalSupply)])
        .map(x => `(${x.join(',')})`)
        .join(',')

    const _ = await connection.promise().execute("TRUNCATE TABLE protocol_information")
    const rs = await connection.promise().execute(
        `INSERT INTO protocol_information (protocol_name_long,protocol_name_short,token_name,maximum_supply) `+
        `VALUES ${sqlValues} `
    )

    return rs
}


async function tokenPrice() {
}





function run() {
    return protocolInfo()
}

run().then(console.log).catch(console.error)
