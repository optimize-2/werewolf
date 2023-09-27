const crypto = require('crypto');

const key = crypto.randomBytes(1024).toString('hex');
console.log('Key:', key);

const iv = crypto.randomBytes(1024).toString('hex');
console.log('IV:', iv);

// const key = Buffer.from('0241540e4d413fb0062de00aea0d918fe6a1820e782c5cd4340266be3ff940f0', 'hex')
// const iv = Buffer.from('05eec64cc1716184787d03a1a46ef952', 'hex')
// const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
// const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

// const aes = (raw) => {
//     cipher.update(raw, 'utf8', 'hex')
//     return cipher.final('hex')
// }

// const sea = (raw) => {
//     decipher.update(raw, 'hex', 'utf8')
//     return decipher.final('utf8')
// }

// console.log(sea('887b2bfdc5dbc49c7012a87404f3144f'))
// console.log(aes('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'))