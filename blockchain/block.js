import crypto from 'crypto';

class Block {
    constructor(index, timestamp, transactions, previousHash = '') {
        this.index = index; // Block number
        this.timestamp = timestamp; // Timestamp of block creation
        this.transactions = transactions; // List of transactions
        this.previousHash = previousHash; // Hash of the previous block
        this.hash = this.calculateHash(); // Hash of the current block
        this.nonce = 0; // For mining (optional)
        this.minerReward = 10; // Miner reward for this block (e.g., 10 tokens)
    }

    // Calculate the hash of the block
    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(
                this.index +
                this.timestamp +
                JSON.stringify(this.transactions) +
                this.previousHash +
                this.nonce
            )
            .digest('hex');
    }
    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
    }
}

export default Block;