import express from 'express';
import Blockchain from '../blockchain/blockchain.js';
import P2PServer from './p2p.js';
import Transaction from '../blockchain/transaction.js';
import Wallet from '../blockchain/wallet.js'; // Import Wallet class
import Balances from '../blockchain/balance.js'; // Import Balances class

// Function to create and start a node
function createNode(port, peers = []) {
    const blockchain = new Blockchain();
    const p2pServer = new P2PServer(blockchain);

    p2pServer.listen(port); // Start the P2P server on the specified port
    peers.forEach((peer) => p2pServer.connectToPeer(peer)); // Connect to peers

    console.log(`Node running on port ${port}`);

    // Start API server for this node
    const app = express();
    app.use(express.json());

    // Create a new wallet
    app.post('/create-wallet', (req, res) => {
        const wallet = new Wallet();
        res.json({
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
        });
    });

    // Submit data (signed by the sender)
    app.post('/submit-data', (req, res) => {
        const { sender, receiver, data, signature, miner } = req.body;

        const transaction = new Transaction(sender, receiver, data, signature);
        // Validate the transaction
        if (!transaction.isValid()) {
            res.status(400).send('Invalid transaction signature.');
            return;
        }

        if (blockchain.isDuplicateTransaction(transaction)) {
            res.status(400).send('Duplicate data detected. Transaction rejected.');
            return;
        }

        if (blockchain.isTransactionValid(transaction)) {
            blockchain.addTransaction(transaction);
            p2pServer.broadcastTransaction(transaction);
            blockchain.minePendingTransactions(miner); // Pass the miner address
            res.status(201).send('Transaction added, mined, and broadcasted');
        } else {
            res.status(400).send('Transaction rejected due to duplication.');
        }
    });

    // Fetch the latest blocks
    app.get('/blocks', (req, res) => {
        res.json(blockchain.chain);
    });

    // View miner rewards
    app.get('/rewards', async (req, res) => {
        const minerAddress = req.query.miner;
        const rewards = await Balances.getBalance(minerAddress);
        res.json({ minerAddress, rewards });
    });

    // Get miner balance
    app.get('/balance', async (req, res) => {
        const { publicKey } = req.query;
        const balance = await Balances.getBalance(publicKey);
        res.json({ publicKey, balance });
    });

    const API_PORT = port + 1000; // API server runs on a different port
    app.listen(API_PORT, () => {
        console.log(`API server for node on port ${port} running on port ${API_PORT}`);
    });
}

// Bootstrap node (first node in the network)
const BOOTSTRAP_PORT = 5001;
createNode(BOOTSTRAP_PORT);

// Other nodes
const NODE_PORTS = [5002, 5003, 5004]; // Ports for other nodes
NODE_PORTS.forEach((port, index) => {
    const peers = [`ws://localhost:${BOOTSTRAP_PORT}`]; // Connect to bootstrap node
    if (index > 0) {
        peers.push(`ws://localhost:${NODE_PORTS[index - 1]}`); // Connect to previous node
    }
    createNode(port, peers);
});