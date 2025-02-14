import express from 'express';
import Blockchain from '../blockchain/blockchain.js';
import P2PServer from './p2p.js';
import Transaction from '../blockchain/transaction.js';

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

    app.post('/submit-data', (req, res) => {
        const { sender, receiver, data } = req.body;
        const transaction = new Transaction(sender, receiver, data);

        console.log(`Received transaction from ${sender} to ${receiver} with data: ${data}`);

        if (blockchain.isDuplicateTransaction(transaction)) {
            res.status(400).send('Duplicate data detected. Transaction rejected.');
            return;
        }

        if (blockchain.isTransactionValid(transaction)) {
            if (blockchain.addTransaction(transaction)) {
                p2pServer.broadcastTransaction(transaction);
                blockchain.minePendingTransactions(req.body.miner); // Pass the miner address
                res.status(201).send('Transaction added, mined, and broadcasted');
            } else {
                res.status(400).send('Transaction rejected due to duplication.');
            }
        } else {
            res.status(400).send('Invalid transaction');
        }
    });

    app.get('/blocks', (req, res) => {
        res.json(blockchain.chain);
    });

    app.get('/rewards', (req, res) => {
        const minerAddress = req.query.miner;
        const rewards = blockchain.chain
            .flatMap(block => block.transactions)
            .filter(tx => tx.receiver === minerAddress && tx.data === 'Miner Reward')
            .length * 10; // Assuming 10 tokens per reward
        res.json({ minerAddress, rewards });
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