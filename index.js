

import dotenv from 'dotenv'
dotenv.config()

import pLimit from 'p-limit'

import Web3 from 'web3'

import mysql from 'mysql2'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dbConf = require('./database.json')
import chains from './contracts/chains.js'
import { combineLatestWith, map, Observable, share } from 'rxjs'

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

const web3s = Object.fromEntries(chains.map(chain => {
    const options = {
        // Enable auto reconnection
        reconnect: {
            auto: true,
            delay: 5000, // ms
            maxAttempts: 5,
            onTimeout: false
        }
    }

    const ws = new Web3.providers.WebsocketProvider(chain.provider, options)

    return [chain.name, new Web3(ws)]
}))


function allTokens() {
    return chains.flatMap(chain => {

        return Object.values(chain.tokens)
            .map(token => {
                return {
                    chain: {name: chain.name},
                    ...token
                }
            })
    })
}

function web3Contract(web3) {
    return (config) => new web3.eth.Contract(abis[config.abi], config.address)
}

async function erc20Decimals(contract) {
    return contract.methods.decimals().call()
}

async function protocolInfoOf(token) {
    const contract = web3Contract(web3s[token.chain.name])(token)
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
        name,
        symbol,
        decimals,
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

function pairContract(web3) {
    return (addr) => new web3.eth.Contract(abis['iuniswapv2-pair-abi'], addr)
}

async function tokenPriceIn(data) {
    const { chain, exchange, token } = data
    const web3 = web3s[chain.name]
    const contractFrom = web3Contract(web3)
    const factory = contractFrom(exchange.factory)

    const price = async (tokenA, tokenB) => {
        const pairAddr = await factory.methods.getPair(tokenA.address, tokenB.address).call()
        const contract = pairContract(web3)(pairAddr)
        const decimalsA = await erc20Decimals(contractFrom(tokenA))
        const decimalsB =  await erc20Decimals(contractFrom(tokenB))
        const start = Date.now()
        const { reserve0, reserve1 } = await contract.methods.getReserves().call()
        const end = Date.now()
        return {
            price: calPrice(tokenA, decimalsA, tokenB, decimalsB, reserve0, reserve1),
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

function observableFromEvent(event) {
    return new Observable(sub => {
        event
            .on('data', (data) => {
                console.log("data is coming")
                sub.next(data)
            })
            .on('error', (err) => {
                sub.error(err)
            })
            .on('end', () => sub.unsubscribe())

    })
    .pipe(share())
}

function calPrice(tokenA, decimalsA, tokenB, decimalsB, reserve0, reserve1) {
    const decimals = 10**(decimalsA - decimalsB)
    const ascOrdered = tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
    return ascOrdered ? (reserve1 / reserve0) * decimals : (reserve0 / reserve1) * decimals
}

function tokenPriceStream(web3, factory) {
    return async (tokenA, tokenB) => {
        const decimalsB = await erc20Decimals(web3Contract(web3)(tokenA))
        const decimalsA = await erc20Decimals(web3Contract(web3)(tokenB))
        const pairAddr = await factory.methods.getPair(tokenA.address, tokenB.address).call()
        const pair = pairContract(web3)(pairAddr)

        const priceStream = (reserveStream, getReserve) => {
            return reserveStream
                .pipe(map(data => {
                        const returnVal = data.returnValues
                        const {reserve0, reserve1} = getReserve(returnVal)
                        return {
                            price: calPrice(tokenA, decimalsA, tokenB, decimalsB, reserve0, reserve1),
                            txHash: data.transactionHash,
                            blockNumber: data.blockNumber
                        }
                    })
                )
        }

        return {
            sync: priceStream(observableFromEvent(pair.events.Sync()), (data) => {
                return {
                    reserve0: data.reserve0,
                    reserve1: data.reserve1,
                }
            }),
            swap: priceStream(observableFromEvent(pair.events.Swap()), (data) => {
                return {
                    reserve0: +data.amount0In === 0 ? data.amount0Out : data.amount0In,
                    reserve1: +data.amount1Out === 0 ? data.amount1In : data.amount1Out,
                }
            })
        }
    }
}


async function tokenPriceOn(chain) {
    const web3 = web3s[chain.name]
    const promises = await Promise.all(
        chain.exchanges.flatMap(async (exchange) => {
            const factory = await web3Contract(web3)(exchange.factory)
            const ethUsdtStream =  await tokenPriceStream(web3, factory)(exchange.eth, exchange.usdt)

            const combineWithEthUsdt = (stream, ethUsdt, token) => {
                return stream
                    .pipe(combineLatestWith(ethUsdt))
                    .pipe(map(([tokenEth, ethUsdt]) => {
                        return {
                            exchange,
                            token,
                            tokenEth,
                            ethUsdt
                        }
                    }))
            }

            return Promise.all(chain.tokens
                .map(async (token) => {
                    const {sync, swap} = await tokenPriceStream(web3, factory)(token, exchange.eth)
                    return {
                        sync: combineWithEthUsdt(sync, ethUsdtStream.sync, token),
                        swap: combineWithEthUsdt(swap, ethUsdtStream.swap, token)
                    }
                })
            )
        })
    )
    return promises.flatMap(x => x)
}


async function tokenPrice() {
    const data = await Promise.all(
        chains.flatMap(chain => {
            return chain.exchanges.flatMap(exchange => chain.tokens.map(token => {
                return { chain: { name: chain.name, provider: chain.provider } , exchange, token }
            }))
        })
        .map(data => tokenPriceIn(data))
    )
    return data
}





async function run() {
    const obs = await tokenPriceOn(chains[2])
    obs.map(ob => {
        ob.swap.subscribe({
            next(data) {
                console.log(JSON.stringify(data))
            },
            error(err) { console.error('something wrong occurred: ' + err); },
            complete() { console.log('done'); }
        })
    })

    // return tokenPrice()
    // return protocolInfo()
}

run()
    // .then(console.log)
    // .catch(console.error)
    // .finally(() => {
    //     Object.values(web3s).map(web3 => web3.currentProvider.disconnect())
    //     connection.destroy()
    // })
