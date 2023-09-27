import CryptoJS from "crypto-js";

const secret = 'hzgang06'

const aes = (raw: string) => {
    // return cryptr.encrypt(raw)
    return CryptoJS.AES.encrypt(raw, secret).toString();
    // const cipher = createCipheriv('aes-256-cbc', key, iv);
    // cipher.update(raw, 'utf8', 'hex')
    // return cipher.final('hex')
}

const sea = (raw: string) => {
    // return cryptr.decrypt(raw)
    return CryptoJS.AES.decrypt(raw, secret).toString(CryptoJS.enc.Utf8);
    // const decipher = createDecipheriv('aes-256-cbc', key, iv);
    // decipher.update(raw, 'hex', 'utf8')
    // return decipher.final('utf8')
}

console.log(aes('hzgang0666666666666666666666666'))
console.log(sea(aes('hzgang0666666666666666666666666')))