
require('dotenv').config()
const Web3 = require('web3')

const mysql = require('mysql2')
const dbConf = require('./database.json')

const contracts = require('./contracts/contracts.json')
const abi = {
    bep20: require('./contracts/bep20.json'),
    erc20: require('./contracts/erc20.json')
}
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


async function protocolInfoOf(contract) {
    const web3 = new Web3(contract.provider)
    const remoteContract = new web3.eth.Contract(abi[contract.abi], contract.address)

    const name = await remoteContract.methods.name().call()
    const symbol = await remoteContract.methods.symbol().call()
    const decimals = await remoteContract.methods.decimals().call()
    const totalSupply = await remoteContract.methods.totalSupply().call()

    return {
        address: contract.address,
        name: name,
        symbol: symbol,
        totalSupply: totalSupply / (10 ** decimals),
    }
}

function quote(x) {
    return `'${x}'`
}


async function protocolInfo() {

    const promises = Object.keys(contracts)
        .map(k => {
            return protocolInfoOf(contracts[k])
        })

    const xs = await Promise.all(promises)
    const sqlValues = xs
        .map(x => [quote(x.address), quote(x.name), quote(x.symbol), quote(x.symbol), quote(x.totalSupply)])
        .map(x => `(${x.join(',')})`)
        .join(',')

    const _ = await connection.promise().execute("TRUNCATE TABLE protocol_information")
    const rs = await connection.promise().execute(
        `INSERT INTO protocol_information (address,protocol_name_long,protocol_name_short,token_name,maximum_supply) `+
        `VALUES ${sqlValues} `
    )

    return rs
}




function run() {
    return protocolInfo()
}

run().then(console.log).catch(console.error)
