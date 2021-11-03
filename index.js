

import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import pLimit from 'p-limit'

import Web3 from 'web3'

import mysql from 'mysql2'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dbConf = require('./database.json')
import chains from './contracts/chains.js'

const limit = pLimit(8)
const abis = {
    bep20: require('./contracts/bep20.json'),
    erc20: require('./contracts/erc20.json'),
    "iuniswapv2-factory-abi": require('./contracts/iuniswapv2-factory-abi.json'),
    "iuniswapv2-pair-abi": require('./contracts/iuniswapv2-pair-abi.json')
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


function allTokens() {
    return chains.flatMap(chain => {

        return Object.values(chain.tokens)
            .map(token => {
                return {
                    chain: chain,
                    ...token
                }
            })
    })
}

function contractOf(token) {
    const web3 = new Web3(token.chain.provider)
    const contract = new web3.eth.Contract(abis[token.abi], token.address)
    return contract
}

async function decimalsOf(token) {
    return contractOf(token).methods.decimals().call()
}

async function protocolInfoOf(token) {
    const contract = contractOf(token)
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
        decimals: decimals,
        totalSupply: totalSupply / (10 ** decimals),
        chain: token.chain.name
    }
}

function quote(x) {
    return `'${x}'`
}


async function protocolInfo() {

    const promises = allTokens().map(token => protocolInfoOf(token))

    const xs = await Promise.all(promises)
    const sqlValues = xs
        .map(x => [quote(x.name), quote(x.symbol), quote(x.symbol), quote(x.chain), quote(x.totalSupply)])
        .map(x => `(${x.join(',')})`)
        .join(',')

    const _ = await connection.promise().execute("TRUNCATE TABLE protocol_information")
    const rs = await connection.promise().execute(
        `INSERT INTO protocol_information (protocol_name_long,protocol_name_short,token_name,operating_chain,maximum_supply) ` +
        `VALUES ${sqlValues} `
    )

    return rs
}

async function tokenPriceIn(data) {
    const { chain, exchange, token } = data
    const web3 = new Web3(chain.provider)
    const factory = new web3.eth.Contract(abis[exchange.factory.abi], exchange.factory.address)

    const price = async (token0, token1) => {
        const pairAddr = await factory.methods.getPair(token0.address, token1.address).call()
        const contract = new web3.eth.Contract(abis['iuniswapv2-pair-abi'], pairAddr)
        const decimals0 = await decimalsOf({...token0, chain: chain})
        const decimals1 =  await decimalsOf({...token1, chain: chain})
        const start = Date.now()
        const { reserve0, reserve1 } = await contract.methods.getReserves().call()
        const end = Date.now()

        console.log(token0, reserve0, token1, reserve1)

        const ascOrdered = token0.address.toLowerCase() < token1.address.toLowerCase()

        return {
            price: ascOrdered ? (reserve1 / reserve0) * (10**(decimals0 - decimals1)) : (reserve0 / reserve1) * (10**(decimals0 - decimals1)),
            start: start,
            end: end
        }
    }

    const prices = await Promise.all([
        price(token, exchange.eth),
        price(exchange.eth, exchange.usdt)
    ])

    return {
        protocolName: exchange.name,
        tokenName: token.name,
        ...prices.reduce((acc, ele) => {
            return {
                price: acc.price * ele.price,
                connectionTime: acc.connectionTime + ele.end - ele.start
            }
        }, {price: 1, connectionTime: 0})
    }


}


async function tokenPrice() {
    const data = await Promise.all(
        chains.flatMap(chain => {
            return chain.exchanges.flatMap(exchange => chain.tokens.map(token => {
                return { chain: { provider: chain.provider } , exchange: exchange, token: token }
            }))
        })
        .map(data => tokenPriceIn(data))
    )
    return data
}





function run() {
    return tokenPrice()
    // return protocolInfo()
}

run()
    .then(console.log).catch(console.error)
