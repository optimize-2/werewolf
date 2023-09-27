var CryptoJS = require("crypto-js");
var ciphertext = CryptoJS.AES.encrypt('my messddddddddddddddddddddddddddddddddddddddddddddddddsage', 'hzgang06').toString();
var bytes  = CryptoJS.AES.decrypt(ciphertext, 'hzgang06');
var originalText = bytes.toString(CryptoJS.enc.Utf8);
console.log(ciphertext)
console.log(originalText)