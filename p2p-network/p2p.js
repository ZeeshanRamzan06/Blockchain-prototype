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
        // console.log('Socket connected');

        // Handle incoming messages
        socket.on('message', (message) => {
            const data = JSON.parse(message);
            this.handleMessage(data);
        });

        // Send the current blockchain to the new peer
        this.sendChain(socket);
    }

    // Broadcast messages to all connected peers
    broadcast(message) {
        this.sockets.forEach((socket) => socket.send(JSON.stringify(message)));
    }

    // Handle incoming messages
    handleMessage(data) {
        switch (data.type) {
            case 'CHAIN':
                // console.log('Received chain from peer:', data.chain);
                this.blockchain.replaceChain(data.chain);
                break;
            case 'TRANSACTION':
                console.log('Received transaction:', data.transaction);
                const transaction = new Transaction(
                    data.transaction.sender,
                    data.transaction.receiver,
                    data.transaction.data,
                    data.transaction.signature
                );
                this.blockchain.addTransaction(transaction);
                break;
        }
    }

    // Send the current blockchain to a socket
    sendChain(socket) {
        socket.send(JSON.stringify({
            type: 'CHAIN',
            chain: this.blockchain.chain
        }));
    }

    // Broadcast a transaction to all peers
    broadcastTransaction(transaction) {
        this.broadcast({
            type: 'TRANSACTION',
            transaction
        });
    }
}

export default P2PServer;