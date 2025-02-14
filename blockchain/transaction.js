import Wallet from './wallet.js';

class Transaction {
    constructor(sender, receiver, data, signature = null) {
        this.sender = sender; // Sender's public key
        this.receiver = receiver; // Receiver's public key
        this.data = data; // Data being transmitted
        this.timestamp = Date.now(); // Timestamp of the transaction
        this.signature = signature; // Signature of the transaction
    }

    // Sign the transaction with the sender's private key
    signTransaction(wallet) {
        if (wallet.publicKey !== this.sender) {
            throw new Error('You cannot sign transactions for other wallets!');
        }
        const dataToSign = this.sender + this.receiver + JSON.stringify(this.data);
        this.signature = wallet.sign(dataToSign);
    }

    // Verify the transaction's signature
    isValid() {
        if (this.sender === null) return true; // Miner reward transactions have no sender
        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }
        const dataToVerify = this.sender + this.receiver + JSON.stringify(this.data);
        return Wallet.verifySignature(this.sender, dataToVerify, this.signature);
    }
}

export default Transaction;