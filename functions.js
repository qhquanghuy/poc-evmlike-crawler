
import { createRequire } from 'module'
const require = createRequire(import.meta.url)


function quote(x) {
    return `'${x}'`
}

function addrCmp(contract0, contract1) {
    return contract0.address.toLowerCase() < contract1.address.toLowerCase()
}


const id = x => x

export { id, quote, require, addrCmp }