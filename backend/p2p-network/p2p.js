import { WebSocketServer, WebSocket } from 'ws';
import Blockchain from '../blockchain/blockchain.js';
import Transaction from '../blockchain/transaction.js';

class P2PServer {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.sockets = [];
    }

    // Start the WebSocket server
    listen(port) {
        const server = new WebSocketServer({ port });
        server.on('connection', (socket) => this.connectSocket(socket));
        console.log(`P2P server listening on port ${port}`);
    }

    // Connect to other peers
    connectToPeer(peer) {
        const socket = new WebSocket(peer);
        socket.on('open', () => this.connectSocket(socket));
    }

    // Handle new socket connections
    connectSocket(socket) {
        this.sockets.push(socket);

        // Handle incoming messages
        socket.on('message', (message) => {
            const data = JSON.parse(message);
            this.handleMessage(data);
        });

        // Send the current blockchain to the new peer
        this.sendChain(socket);
    }

    // Custom replacer function to handle BigInt serialization
    broadcast(message) {
        this.sockets.forEach((socket) => {
            socket.send(JSON.stringify(message, (key, value) => 
                typeof value === 'bigint' ? value.toString() : value
            ));
        });
    }
    

    // Handle incoming messages
    handleMessage(data) {
        switch (data.type) {
            case 'CHAIN':
                this.blockchain.replaceChain(data.chain);
                break;
            case 'TRANSACTION':
                console.log('Received transaction:', data.transaction);
                const transaction = new Transaction(
                    data.transaction.sender,
                    data.transaction.receiver,
                    data.transaction.data,
                    data.transaction.gasLimit,
                    data.transaction.signature,
                    data.transaction.timestamp || Date.now()
                );
                // Add transaction without mining
                this.blockchain.addTransaction(transaction);
                break;
            case 'RAW_TRANSACTION':
                console.log('Received raw transaction from peer');
                // Process transaction without mining
                this.blockchain.processSignedTransaction(data.rawTx)
                    .catch(err => console.error('Error processing peer raw transaction:', err));
                break;
            case 'MINE_REQUEST':
                console.log('Received mining request from peer');
                if (data.minerAddress) {
                    this.blockchain.minePendingTransactions(data.minerAddress)
                        .catch(err => console.error('Error mining block after peer request:', err));
                }
                break;
        }
    }

    // Send the current blockchain to a socket
    sendChain(socket) {
        socket.send(JSON.stringify({
            type: 'CHAIN',
            chain: this.blockchain.chain
        }, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
        ));
    }
    

    // Broadcast a transaction to all peers
    broadcastTransaction(transaction) {
        this.broadcast({
            type: 'TRANSACTION',
            transaction
        }, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
        );
    }
    
    
    // Broadcast a mining request to all peers
    broadcastMiningRequest(minerAddress) {
        this.broadcast({
            type: 'MINE_REQUEST',
            minerAddress
        });
    }
}

export default P2PServer;