


import Web3 from 'web3'

import chains from './contracts/chains.js'
import { from, combineLatestWith, map, mergeMap } from 'rxjs'

import {web3Contract, erc20Decimals, pairContract } from './web3s.js'
import { connection } from './db.js'
import { observableFromEvent } from './stream.js'

import { id, quote } from './functions.js'




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



function calPrice(tokenA, decimalsA, tokenB, decimalsB, reserve0, reserve1) {
    const decimals = 10**(decimalsA - decimalsB)
    const ascOrdered = tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
    const price = ascOrdered ? (reserve1 / reserve0) : (reserve0 / reserve1)

    return price * decimals
}

function tokenPriceStream(web3, factory) {
    return async (tokenA, tokenB) => {
        const decimalsA = await erc20Decimals(web3Contract(web3)(tokenA))
        const decimalsB = await erc20Decimals(web3Contract(web3)(tokenB))
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
    return promises.flatMap(id)
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




async function prepareData(web3, data) {
    const [tokenBlock, ethBlock] = await Promise.all([
        web3.eth.getBlock(data.tokenEth.blockNumber),
        web3.eth.getBlock(data.ethUsdt.blockNumber)
    ])
    console.log(data)
    return [
        [data.token.name, `FROM_UNIXTIME(${tokenBlock.timestamp})`, data.exchange.name, data.tokenEth.price * data.ethUsdt.price],
        ["eth", `FROM_UNIXTIME(${ethBlock.timestamp})`, data.exchange.name, data.ethUsdt.price]
    ]
    .map(xs => `(${xs.map((x, idx) => idx == 1 ? x : quote(x)).join(",")})`)
    .join(",")
}


async function insertTokenPriceData(web3, data) {
    const values = await prepareData(web3, data)
    const rs = await connection.promise().execute(
        `INSERT INTO token_price_data (token_name, time_record, record_at, market_price) ` +
        `VALUES ${values} `
    )

    return rs
}

async function insertInstantPriceData(web3, data) {

    const values = await prepareData(web3, data)
    const rs = await connection.promise().execute(
        `INSERT INTO instant_price_data (token_name, time_record, protocol_name, market_price) ` +
        `VALUES ${values} `
    )
    return rs
}
async function run() {


    const insert = (stream, insertFn) => {
        stream.pipe(mergeMap(data => from(insertFn(data))))
        .subscribe({
            next(data) {
                console.log(JSON.stringify(data))
            },
            error(err) { console.error('something wrong occurred: ' + err); },
            complete() { console.log('done'); }
        })
    }

    chains.forEach(async (chain) => {
        const obs = await tokenPriceOn(chain)
        obs.forEach(ob => {
            insert(ob.swap, (data) => insertTokenPriceData(web3s[chain.name], data))
            insert(ob.sync, (data) => insertInstantPriceData(web3s[chain.name], data))
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
