
import { createRequire } from 'module'
const require = createRequire(import.meta.url)


function quote(x) {
    return `'${x}'`
}


const id = x => x

export { id, quote, require }