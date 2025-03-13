import { ethers } from 'ethers';
import crypto from 'crypto';

class Transaction {
    constructor(sender, receiver, data, gasLimit = 0, signature = null, timestamp) {
        this.sender = sender;
        this.receiver = receiver; // Optional for mining (can be null)
        this.data = typeof data === 'string' ? data : ethers.utils.toUtf8String(data); // Ensure data is a string
        this.gasLimit = gasLimit; // 0 for mining
        this.timestamp = timestamp || Date.now(); // Use provided timestamp or default
        this.signature = signature;

        // Validate the receiver address
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
            gasLimit: this.gasLimit
        };
        // Convert BigInt values to strings
        const replacer = (key, value) => (typeof value === 'bigint' ? value.toString() : value);
        return ethers.hashMessage(JSON.stringify(message, replacer)); // Assuming ethers.js v5
    }

    async isValid() {
        if (!this.sender) return true; // Allow unsigned faucet/mining transactions
        if (!this.signature) throw new Error('No signature in this transaction');
    
        const messageHash = this.calculateHash();
        const recoveredAddress = ethers.verifyMessage(messageHash, this.signature);
        console.log('Recovered Address:', recoveredAddress);
    
        return recoveredAddress.toLowerCase() === this.sender.toLowerCase();
    }

    calculateGasFee() {
        return this.gasLimit * 10 ** 9; // Example: gas fee calculation (10 Gwei per gas unit)
    }

    getTotalAmount() {
        return this.data.amount + this.calculateGasFee();
    }
}

export default Transaction;