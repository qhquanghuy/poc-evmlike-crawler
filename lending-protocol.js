

import chains from './contracts/chains.js'
import { from, mergeMap, tap } from 'rxjs'

import {web3Contract, web3s } from './web3s.js'
import { connection } from './db.js'
import { observableFromEvent } from './stream.js'

async function insert(data) {
    return connection.execute(
        `INSERT INTO \`lending_aave_eth_interest_rate\`(lending_rate,borrowing_rate,lending_distribution_apy,borrowing_distribution_apy,time_recorded) ` +
        "VALUES (?, ?, ?, ?, ?)",
        [data.liquidityRate, data.variableBorrowRate, data.depositApy, data.borrowApy, new Date(data.timestamp*1000)]
    )
}

function aaveEth() {
    const ether = chains.find((chain) => chain.name === 'ethereum')

    const web3 = web3s[ether.name]
    const lendingContract = web3Contract(web3)(ether.lending.aave)
    observableFromEvent(lendingContract.events.ReserveDataUpdated({filter: { reserve: ether.lending.aave.eth }}))
        .pipe(mergeMap(data => {
            const promise = web3.eth.getBlock(data.blockNumber)
                .then(block => {
                    const returnVal = data.returnValues
                    const ray = 10**27
                    const SECONDS_PER_YEAR = 31536000
                    const depositAPR = returnVal.liquidityRate/ray
                    const borrowAPR = returnVal.variableBorrowRate/ray
                    const calAPY = (apr) => ((1 + (apr / SECONDS_PER_YEAR)) ^ SECONDS_PER_YEAR) - 1
                    //NOTE: https://docs.aave.com/developers/guides/apy-and-apr#compute-data
                    return {
                        reserve: returnVal.reserve,
                        timestamp: block.timestamp,
                        liquidityRate: returnVal.liquidityRate,
                        stableBorrowRate: returnVal.stableBorrowRate,
                        variableBorrowRate: returnVal.variableBorrowRate,
                        depositAPY: 100 * calAPY(depositAPR),
                        borrowAPY: 100 * calAPY(borrowAPR)
                    }
                })
            return from(promise)
        }))
        .pipe(tap(console.log))
        .pipe(mergeMap(data => from(insert(data))))
        .subscribe(({
            next(data) {
                console.log("done")
            },
            error(err) { console.error('something wrong occurred: ' + err); },
            complete() { console.log('done'); }
        }))
}

export { aaveEth }