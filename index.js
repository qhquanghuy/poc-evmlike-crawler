

import { tokenPrice } from './token-price.js'
import {protocolInfo} from './protocol-info.js'

import { web3s } from './web3s.js'

import { connection } from './db.js'
import { depositData } from './dex.js'

async function run() {
    tokenPrice()
    depositData()

    // return protocolInfo()
}

run()
    // .then(console.log)
    // .catch(console.error)
    // .finally(() => {
    //     Object.values(web3s).map(web3 => web3.currentProvider.disconnect())
    //     connection.destroy()
    // })
