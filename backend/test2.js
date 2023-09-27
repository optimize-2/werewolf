const crypto = require('crypto');

// 生成随机的密钥
const key = crypto.randomBytes(32).toString('hex');
console.log('Key:', key);

// 生成随机的初始向量
const iv = crypto.randomBytes(16).toString('hex');
console.log('IV:', iv);