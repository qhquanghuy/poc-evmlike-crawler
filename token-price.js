
import chains from './contracts/chains.js'
import { from, combineLatestWith, map, mergeMap, tap } from 'rxjs'

import {web3Contract, erc20Decimals, pairContract, web3s } from './web3s.js'
import { connection } from './db.js'
import { observableFromEvent } from './stream.js'

import { addrCmp, id, quote } from './functions.js'



function calPrice(tokenA, decimalsA, tokenB, decimalsB, reserve0, reserve1) {
    const decimals = 10**(decimalsA - decimalsB)
    const ascOrdered = addrCmp(tokenA, tokenB)
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
                            blockNumber: data.blockNumber,
                            ...[tokenA, tokenB].sort((a, b) => addrCmp(a, b))
                        }
                    })
                )
                .pipe(tap(console.log))
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
}

async function prepareData(web3, data) {
    const [tokenBlock, ethBlock] = await Promise.all([
        web3.eth.getBlock(data.tokenEth.blockNumber),
        web3.eth.getBlock(data.ethUsdt.blockNumber)
    ])
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

export { tokenPrice }