

import chains from './contracts/chains.js'

import {web3Contract, web3s } from './web3s.js'
import { connection } from './db.js'


import { quote } from './functions.js'



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


export { protocolInfo }