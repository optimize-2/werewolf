import { randomUUID } from 'crypto'
import md5 from 'md5'

const uuid = randomUUID(), encrypt = md5(uuid)
console.log(uuid, encrypt)
console.log(`"${encrypt}": ""`)