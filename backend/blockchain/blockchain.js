import Block from './block.js';
import Transaction from './transaction.js';
import Balances from './balances.js';
import { ethers } from 'ethers';
import { Level } from 'level';

const db = new Level('./nonces');

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()]; // Initialize the chain with the genesis block
        this.pendingTransactions = []; // Transactions waiting to be added to a block
        this.difficulty = 4; // Mining difficulty (optional)
        this.dataHashes = new Set(); // Hash table to ensure data uniqueness
        this.chainId = 43210;
        this.miningReward = 100 * 10 ** 18; // QRYPT tokens
        this.gasFee = 10 * 10 ** 18;
        this.contracts = {};
        this.logs = [];
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

    // Add the incrementNonce function
    async incrementNonce(address) {
        try {
            const normalizedAddress = address.toLowerCase();
            let nonce = 0;
            try {
                const storedNonce = await db.get(`nonce:${normalizedAddress}`);
                nonce = parseInt(storedNonce, 10);
                if (isNaN(nonce)) {
                    nonce = 0;
                }
            } catch (error) {
                nonce = 0;
            }
            nonce += 1;
            await db.put(`nonce:${normalizedAddress}`, nonce.toString());
            return nonce;
        } catch (error) {
            console.error('Error incrementing nonce:', error);
            throw error;
        }
    }

    // Modified to separate transaction processing from mining
    async processSignedTransaction(signedTx) {
        try {
            const tx = ethers.Transaction.from(signedTx);
            console.log('Processing transaction from:', tx.from);
            
            // Allow null or empty 'to' address for contract deployments
            if (tx.to && (typeof tx.to !== 'string' || tx.to.trim() === '')) {
                throw new Error('Invalid recipient address');
            }
            
            // Robust data handling
            let data = '';
            if (tx.data) {
                try {
                    // Try different methods to convert data to string
                    if (typeof tx.data === 'string') {
                        // If it's already a string, use it
                        data = tx.data;
                    } else if (ethers.utils && ethers.utils.toUtf8String) {
                        // Try converting hex to UTF-8 string
                        data = ethers.utils.toUtf8String(tx.data);
                    } else if (typeof tx.data === 'object') {
                        // If it's an object, stringify it
                        data = JSON.stringify(tx.data);
                    } else {
                        // Fallback to empty string
                        data = '';
                    }
                } catch (conversionError) {
                    console.error('Data conversion error:', conversionError);
                    data = '';
                }
            }

            // Create transaction object
            const transaction = new Transaction(
                tx.from,
                tx.to,
                data, // Use the processed data
                tx.gasLimit,
                tx.signature,
                Date.now()
            );
        
            // Calculate gas fee (gasPrice * gasLimit)
            const gasFeeInWei = BigInt(tx.gasPrice) * BigInt(tx.gasLimit);
            const totalAmountInWei = BigInt(tx.value || 0) + gasFeeInWei;
        
            // Get sender balance in wei
            const senderBalance = await Balances.getBalance(tx.from);
            
            console.log(`Sender balance: ${senderBalance}`);
            console.log(`Total amount needed: ${totalAmountInWei}`);
            
            // Check if sender has sufficient balance
            if (senderBalance < totalAmountInWei) {
                throw new Error(`Insufficient balance: need ${totalAmountInWei}, have ${senderBalance}`);
            }
        
            // Update balances
            await Balances.updateBalance(tx.from, -totalAmountInWei);
            if (tx.to) {
                await Balances.updateBalance(tx.to, BigInt(tx.value || 0));
            }
            
            // Add transaction to pending list
            this.pendingTransactions.push(transaction);
            
            // Calculate hash but DO NOT mine automatically
            const txHash = transaction.calculateHash();
            
            // Increment nonce
            await this.incrementNonce(tx.from);
            
            return txHash;
        } catch (error) {
            console.error('Transaction processing error:', error);
            throw error;
        }
    }

    // Check if a transaction is a duplicate
    isDuplicateTransaction(transaction) {
        const dataHash = this.hashData(transaction.data);
        return this.dataHashes.has(dataHash);
    }

    // Add a transaction to the pending transactions list without mining
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
        if (transaction.sender) {
            Balances.updateBalance(transaction.sender, -this.gasFee);
        }
        if (transaction.receiver) {
            const amount = parseInt(transaction.data.amount, 10) || 0;
            Balances.updateBalance(transaction.receiver, amount);
        }
        this.pendingTransactions.push(transaction);
        this.dataHashes.add(dataHash);
        console.log(`Transaction added. Data hash: ${dataHash}`);
        return true;
    }
    
    // Modified to separate transaction processing from mining
    async processTransaction(transaction) {
        const isValid = await transaction.isValid();
        if (!isValid) throw new Error('Invalid transaction signature');
    
        // Regular transaction logic (with gas fees) for non-faucet transactions
        const gasFee = this.gasFee;
        const totalAmount = parseInt(transaction.data.amount, 10) + gasFee;
        const senderBalance = await Balances.getBalance(transaction.sender);
        if (senderBalance < totalAmount) {
            throw new Error('Insufficient balance for transaction');
        }
        await Balances.updateBalance(transaction.sender, -totalAmount);
        await Balances.updateBalance(transaction.receiver, parseInt(transaction.data.amount, 10));
        this.pendingTransactions.push(transaction);
        return transaction.calculateHash();
    }
    
    // Mining function that is explicitly called after data submission
    async minePendingTransactions(minerAddress) {
        // Only mine if there are pending transactions
        if (this.pendingTransactions.length === 0) {
            console.log("No pending transactions to mine");
            return null;
        }
        
        console.log(`Mining block with ${this.pendingTransactions.length} transactions`);
        
        const transactions = [...this.pendingTransactions];
        this.pendingTransactions = []; // Clear pending transactions

        const block = new Block(
            this.chain.length,
            Date.now(),
            transactions.map(tx => {
                if (!(tx instanceof Transaction)) {
                    // Properly instantiate Transaction objects
                    return new Transaction(tx.sender, tx.receiver, tx.data, tx.gasLimit, tx.signature, tx.timestamp);
                }
                return tx;
            }),
            this.getLatestBlock().hash
        );
        
        block.mineBlock(this.difficulty);
        this.chain.push(block);

        // Award mining reward
        const reward = this.miningReward;
        await Balances.updateBalance(minerAddress, reward);

        console.log(`Block mined by ${minerAddress} with reward: ${reward / 10 ** 18} QRYPT`);
        console.log('Transactions in block:', block.transactions.map(tx => tx.calculateHash()));
        console.log('Block added to blockchain:', block.hash);
        return block.hash;
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
        // Allow miner reward transactions (sender is null)
        if (transaction.sender === null) {
            return true;
        }
        
        if (!transaction.isValid()) {
            console.log('Invalid transaction signature.');
            return false;
        }

        // Check for duplicate data (only for non-reward transactions)
        if (transaction.sender !== null) {
            const dataHash = this.hashData(transaction.data);
            if (this.dataHashes.has(dataHash)) {
                console.log('Duplicate data detected. Transaction rejected.');
                return false;
            }
        }

        return true;
    }

    // Hash the data using SHA-256
    hashData(data) {
        return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));
    }

    // Validate the data format (example: must be an object)
    isDataFormatValid(data) {
        return (typeof data === 'object' && data !== null) || typeof data === 'string';
    }

    getChainId() {
        return this.chainId;
    }

    getAllTransactions() {
        const transactions = [];
        for (const block of this.chain) {
            transactions.push(...block.transactions);
        }
        return transactions;
    }

    getGasPrice() {
        return 10 * 10 ** 9; // Example: 10 Gwei
    }
    
    // Check if there are pending transactions that need to be mined
    hasPendingTransactions() {
        return this.pendingTransactions.length > 0;
    }
}

export default Blockchain;