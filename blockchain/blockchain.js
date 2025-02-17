import crypto from 'crypto';
import Block from './block.js';
import Transaction from './transaction.js';
import Balances from './balance.js';
class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()]; // Initialize the chain with the genesis block
        this.pendingTransactions = []; // Transactions waiting to be added to a block
        this.difficulty = 4; // Mining difficulty (optional)
        this.dataHashes = new Set(); // Hash table to ensure data uniqueness
    }

    // Create the genesis block
    createGenesisBlock() {
        return new Block(0, Date.now(), [], '0');
    }

    // Get the latest block in the chain
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Add a new block to the chain
    addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.mineBlock(this.difficulty); // Optional Mine the block
        this.chain.push(newBlock);
    }

    // Check if a transaction is a duplicate
    isDuplicateTransaction(transaction) {
        const dataHash = this.hashData(transaction.data);
        return this.dataHashes.has(dataHash);
    }

    // Add a transaction to the pending transactions list
    addTransaction(transaction) {
        if (!(transaction instanceof Transaction)) {
            throw new Error('Invalid transaction object');
        }

        const dataHash = this.hashData(transaction.data);

        if (this.isDuplicateTransaction(transaction)) {
            console.log(`Duplicate data detected. Transaction rejected. Data hash: ${dataHash}`);
            return false;
        }

        if (!this.isTransactionValid(transaction)) {
            throw new Error('Invalid transaction');
        }

        this.pendingTransactions.push(transaction);
        this.dataHashes.add(dataHash); // Add the data hash to the hash table after validation
        console.log(`Transaction added. Data hash: ${dataHash}`);

        // Mine pending transactions after adding a valid transaction
        this.minePendingTransactions();
        return true;
    }

    // Mine pending transactions and add them to a new block
    async minePendingTransactions(minerPublicKey = 'defaultMinerPublicKey') {
        if (!minerPublicKey) {
            throw new Error('Miner public key cannot be null or undefined');
        }
        const rewardTransaction = new Transaction(null, minerPublicKey, 'Miner Reward');
        this.pendingTransactions.push(rewardTransaction);

        const block = new Block(this.chain.length, Date.now(), this.pendingTransactions);
        this.addBlock(block);

        // Update miner balance
        await Balances.updateBalance(minerPublicKey, 10);

        this.pendingTransactions = []; // Clear pending transactions
    }

    // Replace the chain with a new one if it's valid and longer
    replaceChain(newChain) {
        if (newChain.length <= this.chain.length) {
            // console.log('Received chain is not longer than the current chain.');
            return false;
        }

        if (!this.isChainValid(newChain)) {
            console.log('Received chain is invalid.');
            return false;
        }

        console.log('Replacing the current chain with the new chain.');
        this.chain = newChain;
        return true;
    }

    // Validate the integrity of the blockchain
   // Validate the integrity of a given chain
   isChainValid(chain) {
    for (let i = 1; i < chain.length; i++) {
        const currentBlock = chain[i];
        const previousBlock = chain[i - 1];

        // Check if the current block's hash is valid
        if (currentBlock.hash !== currentBlock.calculateHash()) {
            return false;
        }

        // Check if the previous hash matches
        if (currentBlock.previousHash !== previousBlock.hash) {
            return false;
        }
    }
    return true;
}

    // Validate a transaction (Proof of Data mechanism)
    isTransactionValid(transaction) {
        if (!transaction.isValid()) {
            console.log('Invalid transaction signature.');
            return false;
        }

        // Check for duplicate data
        const dataHash = this.hashData(transaction.data);
        if (this.dataHashes.has(dataHash)) {
            console.log('Duplicate data detected. Transaction rejected.');
            return false;
        }

        // Add the data hash to the hash table
        this.dataHashes.add(dataHash);
        return true;
    }

    // Hash the data using SHA-256
    hashData(data) {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }

    // Validate the data format (example: must be an object)
    isDataFormatValid(data) {
    return (typeof data === 'object' && data !== null) || typeof data === 'string';
}
}

export default Blockchain;