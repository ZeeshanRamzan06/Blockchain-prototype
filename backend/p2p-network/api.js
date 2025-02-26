import express from 'express';
import Blockchain from '../blockchain/blockchain.js';
import P2PServer from './p2p.js';
import Transaction from '../blockchain/transaction.js';
import Balances from '../blockchain/balances.js';
import { ethers } from 'ethers';
import { Level } from 'level';

const db = new Level('./nonces');

function createNode(port, peers = []) {
    const blockchain = new Blockchain();
    const p2pServer = new P2PServer(blockchain);
    p2pServer.listen(port);
    peers.forEach((peer) => p2pServer.connectToPeer(peer));

    console.log(`Node running on port ${port}`);

    const app = express();

    // Increase JSON payload size limit to 50MB
    app.use(express.json({ limit: '50mb' }));
    // Increase URL-encoded payload size limit
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // CORS middleware
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', 'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn');
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });

    async function getTransactionCount(address) {
        try {
            const nonce = await db.get(`nonce:${address}`) || 0;
            console.log(`Nonce for address ${address}: ${nonce}`);
            return nonce;
        } catch (error) {
            console.error('Error fetching nonce:', error);
            throw error; // Rethrow the error to propagate it
        }
    }

    // Helper function to check if an address is a contract
    async function isContractAddress(address) {
        // In your custom network, all addresses are non-contract addresses
        return false;
    }


    app.post('/', async (req, res) => {
        const { method, params, id } = req.body;

        const response = (result) => ({
            jsonrpc: '2.0',
            id: id || 1,
            result,
        });

        const errorResponse = (errorMsg) => ({
            jsonrpc: '2.0',
            id: id || 1,
            error: { code: -32601, message: errorMsg },
        });

        const toHex = (value) => {
            const num = Number(value);
            if (isNaN(num) || value === undefined || value === null) {
                return '0x0'; // Default to 0 if invalid
            }
            return `0x${Math.max(0, Math.floor(num)).toString(16)}`; // Ensure non-negative integer
        };

        try {
            switch (method) {
                case 'eth_chainId':
                    res.json(response(toHex(blockchain.getChainId())));
                    break;
                case 'net_version':
                    res.json(response(String(blockchain.getChainId())));
                    break;
                case 'eth_blockNumber':
                    res.json(response(toHex(blockchain.chain.length - 1)));
                    break;
                case 'eth_accounts':
                    res.json(response([]));
                    break;
                case 'eth_gasPrice':
                    const gasPrice = 10 * 10 ** 9; // Example: 10 Gwei
                    res.json(response(`0x${gasPrice.toString(16)}`)); // Return gas price in wei as a hex string
                    break;
                case 'eth_estimateGas':
                    const [tx] = params || [];
                    if (!tx) {
                        res.status(400).json(errorResponse('Transaction data required'));
                        return;
                    }
                    const gasLimit = 21000; // Example: Default gas limit for a simple transfer
                    res.json(response(`0x${gasLimit.toString(16)}`)); // Return gas limit as a hex string
                    break;
                case 'eth_getBalance':
                    const [address] = params || [];
                    if (!address) {
                        res.status(400).json(errorResponse('Address parameter required'));
                        return;
                    }
                    const balance = await Balances.getBalance(address);
                    res.json(response(`0x${balance.toString(16)}`)); // Return balance in wei as a hex string
                    break;
                case 'eth_getCode':
                    const [address1] = params || [];
                    if (!address1) {
                        res.status(400).json(errorResponse('Address parameter required'));
                        return;
                    }
                    // In your custom network, all addresses are non-contract addresses
                    res.json(response('0x')); // Return '0x' for non-contract addresses
                    break;
                case 'eth_getTransactionCount':
                    const [address2] = params || [];
                    if (!address2) {
                        res.status(400).json(errorResponse('Address parameter required'));
                        return;
                    }
                    const nonce = await getTransactionCount(address2); // Fetch the nonce
                    res.json(response(`0x${nonce.toString(16)}`)); // Return nonce as a hex string
                    break;
                case 'eth_sendTransaction':
                    const [txData] = params || [];
                    if (!txData) {
                        res.status(400).json(errorResponse('Transaction data required'));
                        return;
                    }
                    const { from, to, value, gas, gasPrice1, data } = txData;
                    const amount = parseInt(value, 16); // Convert value from hex to wei
                    const transaction = new Transaction(from, to, { amount }, gas, null, Date.now());
                    try {
                        const txHash = await blockchain.processTransaction(transaction);
                        console.log('Transaction hash:', txHash);
                        p2pServer.broadcastTransaction(transaction);
                        res.json(response(txHash));
                    } catch (error) {
                        res.status(400).json(errorResponse(error.message));
                    }
                    break;
                case 'eth_sendRawTransaction':
                    const [signedTx] = params || [];
                        if (!signedTx) {
                         res.status(400).json(errorResponse('Signed transaction data required'));
                         return;
                    }
                    try {
        // Decode and process the signed transaction
                                const txHash = await blockchain.processSignedTransaction(signedTx);
                                console.log('Transaction added with hash:', txHash);
                                res.json(response(txHash)); // Return the transaction hash
                                } catch (error) {
                                console.error('Error processing signed transaction:', error);      
                            res.status(500).json(errorResponse(error.message));
                         }
                    break;
                case 'eth_call':
                    const [txCall, block1] = params || [];
                    if (!txCall) {
                        res.status(400).json(errorResponse('Transaction data required'));
                        return;
                    }
                    const { to: callTo, data: callData } = txCall;
                    if (callData.startsWith('0x70a08231')) { // ERC-20 balanceOf
                        const address = callData.slice(34); // Extract address from data
                        const balance = await Balances.getBalance(`0x${address}`);
                        res.json(response(`0x${balance.toString(16).padStart(64, '0')}`)); // Return balance in hex
                    } else {
                        res.json(response('0x')); // Default response for unsupported calls
                    }
                    break;

                    case 'eth_getTransactionReceipt':
                        const [txHash] = params || [];
                        if (!txHash) {
                            res.status(400).json(errorResponse('Transaction hash parameter required'));
                            return;
                        }
                        try {
                            // Find the transaction in the blockchain
                            let receipt = null;
                            for (const block of blockchain.chain) {
                                for (const tx of block.transactions) {
                                    if (tx.calculateHash() === txHash) {
                                        receipt = {
                                            transactionHash: txHash,
                                            blockHash: block.hash,
                                            blockNumber: toHex(block.index),
                                            gasUsed: toHex(21000), // Example: Fixed gas used
                                            status: '0x1', // Example: Assume all transactions are successful
                                            logs: [], // Example: No logs
                                            logsBloom: '0x00', // Example: No logs
                                            cumulativeGasUsed: toHex(21000), // Example: Fixed cumulative gas used
                                            contractAddress: null, // Example: No contract deployment
                                        };
                                        break;
                                    }
                                }
                                if (receipt) break;
                            }
                    
                            if (receipt) {
                                res.json(response(receipt));
                            } else {
                                res.status(404).json(errorResponse('Transaction not found'));
                            }
                        } catch (error) {
                            console.error('Error fetching transaction receipt:', error);
                            res.status(500).json(errorResponse('Server error'));
                        }
                        break;   
                case 'eth_getBlockByNumber':
                    const [blockNumber, includeTx] = params || [];
                    if (!blockNumber) {
                        res.status(400).json(errorResponse('Block number parameter required'));
                        return;
                    }
                    const blockNum = parseInt(blockNumber, 16); // Convert hex to decimal
                    if (blockNum >= blockchain.chain.length || blockNum < 0) {
                        res.status(404).json(errorResponse('Block not found'));
                        return;
                    }
                    const block = blockchain.chain[blockNum];
                    const blockResponse = {
                        number: toHex(blockNum),
                        hash: block.hash,
                        parentHash: block.previousHash,
                        nonce: toHex(block.nonce),
                        sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
                        logsBloom: '0x00',
                        transactionsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
                        stateRoot: '0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544',
                        miner: block.minerReward ? '0xMinerAddress' : null,
                        difficulty: toHex(blockchain.difficulty),
                        totalDifficulty: toHex(blockchain.difficulty * blockNum),
                        size: toHex(JSON.stringify(block).length),
                        gasLimit: toHex(30000000),
                        gasUsed: toHex(0),
                        timestamp: toHex(block.timestamp),
                        transactions: includeTx ? block.transactions.map(tx => tx.calculateHash()) : [],
                        uncles: []
                    };
                    res.json(response(blockResponse));
                    break;
                default:
                    res.status(400).json(errorResponse('Method not supported'));
                    break;
            }
        } catch (error) {
            console.error('RPC Error:', error);
            res.status(500).json({
                jsonrpc: '2.0',
                id: id || 1,
                error: { code: -32000, message: 'Server error' },
            });
        }
    });

    // Existing endpoints...
    app.get('/blocks', (req, res) => {
        res.json(blockchain.chain);
    });

    app.get('/transactions', (req, res) => {
        res.json(blockchain.getAllTransactions());
    });

    app.get('/balance/:address', async (req, res) => {
        try {
            const { address } = req.params;
            const balance = await Balances.getBalance(address);
            res.json({ address, balance });
        } catch (error) {
            res.status(500).send('Error fetching balance');
        }
    });

    app.get('/transaction/:txHash', (req, res) => {
        const { txHash } = req.params;
        for (const block of blockchain.chain) {
            for (const tx of block.transactions) {
                if (tx.calculateHash() === txHash) {
                    res.json({
                        sender: tx.sender,
                        receiver: tx.receiver,
                        amount: tx.data.amount || 0,
                        gasFee: tx.calculateGasFee(),
                        blockNumber: block.index,
                        status: 'Confirmed',
                        timestamp: block.timestamp,
                    });
                    return;
                }
            }
        }
        res.status(404).json({ error: 'Transaction not found' });
    });

    app.post('/faucet', async (req, res) => {
        const { address } = req.body;
        const faucetTx = new Transaction(null, address, { amount: 1000 }); // No sender (system reward)
        await blockchain.processTransaction(faucetTx);
        p2pServer.broadcastTransaction(faucetTx);
        res.json({ success: true, message: '1000 QRYPT tokens sent', txHash: faucetTx.calculateHash() });
    });

    const API_PORT = port + 1000;
    app.listen(API_PORT, () => {
        console.log(`API server running on port ${API_PORT}`);
    });
}

// Bootstrap node
const BOOTSTRAP_PORT = 5001;
createNode(BOOTSTRAP_PORT);

// Other nodes
const NODE_PORTS = [5002, 5003, 5004];
NODE_PORTS.forEach((port, index) => {
    const peers = [`ws://localhost:${BOOTSTRAP_PORT}`];
    if (index > 0) {
        peers.push(`ws://localhost:${NODE_PORTS[index - 1]}`);
    }
    createNode(port, peers);
});