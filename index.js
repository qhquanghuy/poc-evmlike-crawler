

import { tokenPrice } from './token-price.js'
import { protocolInfo } from './protocol-info.js'

import { depositData, tradingInfo } from './dex.js'

import { aaveEth } from './lending-protocol.js'

async function run() {
    console.log("starting app")
    tokenPrice()
    depositData()
    tradingInfo()

    protocolInfo()

    aaveEth()
}

run()