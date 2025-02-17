import pkg from 'elliptic';
import crypto from 'crypto';

const { ec: EC } = pkg;
const ec = new EC('secp256k1');

const privateKey = 'aeafb64f04183cabadbf52c98d0b039039c2259ae8bcaa1fd42016681e355a8f';
const publicKey = '0403251281eefe5054defdb78de98c3a2fbcac497b63bc497ecea0d909391ea6b04b27d09e78a5708db0c0e745ddf8f9a093e797f075060d85a6c6db3a2763dc57';
const receiver = '04abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef';
const data = 'Hello, Smart Contract!';

const dataToSign = publicKey + receiver + JSON.stringify(data);
const hash = crypto.createHash('sha256').update(dataToSign).digest('hex');
const signature = ec.keyFromPrivate(privateKey).sign(hash).toDER('hex');

console.log('Signature:', signature);