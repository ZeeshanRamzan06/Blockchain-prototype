import express from 'express';
import Blockchain from './blockchain/blockchain.js';

const blockchain = new Blockchain();
const app = express();

app.use(express.json());

// Handle RPC requests
app.post('/', (req, res) => {   
    const { method } = req.body;

    if (method === 'eth_chainId') {
        res.json({
            jsonrpc: '2.0',
            id: 1,
            result: `0x${blockchain.getChainId().toString(16)}`, // Return chain ID in hex
        });
    } else {
        res.status(400).json({ error: 'Method not supported' });
    }
});

const RPC_PORT = 8545;
app.listen(RPC_PORT, () => {
    console.log(`RPC server running on port ${RPC_PORT}`);
});