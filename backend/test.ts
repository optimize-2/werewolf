import { randomUUID } from 'crypto'
import md5 from 'md5'

const uuid = randomUUID()
console.log(uuid, md5(uuid))