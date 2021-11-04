
import chains from './contracts/chains.js'
import { from, map, mergeMap, tap } from 'rxjs'

import {web3Contract, erc20Decimals, pairContract, web3s } from './web3s.js'
import { connection } from './db.js'
import { observableFromEvent } from './stream.js'

import { addrCmp } from './functions.js'




async function data(web3, exchange) {
    const tokenA = exchange.eth
    const tokenB = exchange.usdt
    const factory = await web3Contract(web3)(exchange.factory)
    const decimalsA = await erc20Decimals(web3Contract(web3)(tokenA))
    const decimalsB = await erc20Decimals(web3Contract(web3)(tokenB))
    const pairAddr = await factory.methods.getPair(tokenA.address, tokenB.address).call()
    const pair = pairContract(web3)(pairAddr)


    const ordered = [{...tokenA, decimals: decimalsA}, {...tokenB, decimals: decimalsB}].sort((a,b) => addrCmp(a,b))
    return observableFromEvent(pair.events.Mint({fromBlock: 20977784}))
        .pipe(mergeMap(data => {
            const promise = web3.eth.getBlock(data.blockNumber)
                .then(block => {
                    const { amount0, amount1 } = data.returnValues
                    return {
                        timestamp: block.timestamp,
                        exchange,
                        ...ordered,
                        amount0: amount0 / 10**ordered[0].decimals,
                        amount1: amount1 / 10**ordered[1].decimals
                    }
                })
            return from(promise)
        }))
        .pipe(tap(console.log))


}

async function insert(data) {
    const table = `dex_${data.exchange.name}_${data[0].name}-${data[1].name}_deposit_data`
    const _ = await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`${table}\`(
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        time_record TIMESTAMP NOT NULL,
        value_recorded_one DECIMAL(32,18) NOT NULL,
        token_name_one VARCHAR(50) NOT NULL,
        value_recorded_two DECIMAL(32,18) NOT NULL,
        token_name_two VARCHAR(50) NOT NULL,
        value_recorded_other VARCHAR(255) DEFAULT NULL,
        token_name_others VARCHAR(500) DEFAULT NULL
    )
    `)

    return connection.execute(
        `INSERT INTO \`${table}\`(time_record,value_recorded_one,token_name_one,value_recorded_two,token_name_two) ` +
        "VALUES (?, ?, ?, ?, ?)",
        [new Date(data.timestamp*1000), data.amount0, data[0].name, data.amount1, data[1].name]
    )
}


async function dex() {
    const streams = await Promise.all(chains.flatMap(chain => chain.exchanges.map(exchange => data(web3s[chain.name], exchange))))


        streams.forEach(stream => {
            stream
                .pipe(mergeMap(data => from(insert(data))))
                .subscribe(({
                    next(data) {
                        console.log(JSON.stringify(data))
                    },
                    error(err) { console.error('something wrong occurred: ' + err); },
                    complete() { console.log('done'); }
                }))
        })
}

export { dex }