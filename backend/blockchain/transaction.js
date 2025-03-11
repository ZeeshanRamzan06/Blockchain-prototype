// In transaction.js
import { ethers } from 'ethers';

class Transaction {
    constructor(sender, receiver, data, gasLimit = 0, signature = null, timestamp, uniquenessScore = null) {
        this.sender = sender;
        this.receiver = receiver;
        this.data = typeof data === 'string' ? data : ethers.utils.toUtf8String(data);
        this.gasLimit = gasLimit;
        this.timestamp = timestamp || Date.now();
        this.signature = signature;
        this.uniquenessScore = uniquenessScore; // Store AI uniqueness score

        if (this.receiver && (typeof this.receiver !== 'string' || this.receiver.trim() === '')) {
            throw new Error('Invalid recipient address');
        }
    }

    calculateHash() {
        const message = {
            sender: this.sender,
            receiver: this.receiver || null,
            data: this.data,
            timestamp: this.timestamp,
            gasLimit: this.gasLimit,
            uniquenessScore: this.uniquenessScore
        };
        const replacer = (key, value) => (typeof value === 'bigint' ? value.toString() : value);
        return ethers.hashMessage(JSON.stringify(message, replacer));
    }

    async isValid() {
        if (!this.sender) return true;
        if (!this.signature) throw new Error('No signature in this transaction');

        const messageHash = this.calculateHash();
        const recoveredAddress = ethers.verifyMessage(messageHash, this.signature);
        return recoveredAddress.toLowerCase() === this.sender.toLowerCase();
    }

    calculateGasFee() {
        return this.gasLimit * 10 ** 9; // 10 Gwei per gas unit
    }
}

export default Transaction;