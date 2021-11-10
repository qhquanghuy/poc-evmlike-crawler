

import { tokenPrice } from './token-price.js'
import { protocolInfo } from './protocol-info.js'

import { depositData, tradingInfo } from './dex.js'

async function run() {
    tokenPrice()
    depositData()
    tradingInfo()

    protocolInfo()
}

run()