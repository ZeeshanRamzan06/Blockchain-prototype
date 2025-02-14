import crypto from 'crypto';
import { ec as EC } from 'elliptic'; // Use elliptic library for ECDSA
const ec = new EC('secp256k1'); // Bitcoin's curve

class Wallet {
    constructor() {
        const keyPair = ec.genKeyPair(); // Generate a new key pair
        this.privateKey = keyPair.getPrivate('hex'); // Private key in hex format
        this.publicKey = keyPair.getPublic('hex'); // Public key in hex format
    }

    // Sign data with the private key
    sign(data) {
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        const signature = ec.keyFromPrivate(this.privateKey).sign(hash).toDER('hex');
        return signature;
    }

    // Verify a signature with the public key
    static verifySignature(publicKey, data, signature) {
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        const key = ec.keyFromPublic(publicKey, 'hex');
        return key.verify(hash, signature);
    }
}

export default Wallet;