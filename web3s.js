
import { require } from './functions.js'

const abis = {
    bep20: require('./contracts/bep20.json'),
    erc20: require('./contracts/erc20.json'),
    "iuniswapv2-factory-abi": require('./contracts/iuniswapv2-factory-abi.json'),
    "iuniswapv2-pair-abi": require('./contracts/iuniswapv2-pair-abi.json')
}

function web3Contract(web3) {
    return (config) => new web3.eth.Contract(abis[config.abi], config.address)
}

async function erc20Decimals(contract) {
    return contract.methods.decimals().call()
}


function pairContract(web3) {
    return (addr) => new web3.eth.Contract(abis['iuniswapv2-pair-abi'], addr)
}


export {abis, web3Contract, erc20Decimals, pairContract }