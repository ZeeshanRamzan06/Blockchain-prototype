import express from "express";
import Blockchain from "../blockchain/blockchain.js";
import P2PServer from "./p2p.js";
import Transaction from "../blockchain/transaction.js";
import Balances from "../blockchain/balances.js";
import { ethers } from "ethers";
import { Level } from "level";
import cors from "cors";
const db = new Level("./nonces");



function replacer(key, value) {
    if (typeof value === 'bigint') {
    }
    return value; // Return other types as is
  }
function createNode(port, peers = []) {
  const blockchain = new Blockchain();
  const p2pServer = new P2PServer(blockchain);
  p2pServer.listen(port);
  peers.forEach((peer) => p2pServer.connectToPeer(peer));

  console.log(`Node running on port ${port}`);

  const app = express();

  // Increase JSON payload size limit to 50MB
  app.use(express.json({ limit: "50mb" }));
  // Increase URL-encoded payload size limit
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // CORS middleware
  app.use((req, res, next) => {
    res.header(
      "Access-Control-Allow-Origin",
      "chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn"
    );
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // Helper function to check if an address is a contract
  async function isContractAddress(address) {
    // In your custom network, all addresses are non-contract addresses
    return false;
  }

  // Helper function to get the transaction count (nonce) for an address
  async function getTransactionCount(address) {
    try {
      let nonce = 0;
      try {
        const normalizedAddress = address.toLowerCase();
        const storedNonce = await db.get(`nonce:${normalizedAddress}`);
        nonce = parseInt(storedNonce, 10);
        if (isNaN(nonce)) {
          console.error(
            `Invalid nonce value for ${normalizedAddress}: ${storedNonce}`
          );
          nonce = 0;
        }
      } catch (error) {
        nonce = 0;
      }
      console.log(`Nonce for address ${address}: ${nonce}`);
      return nonce;
    } catch (error) {
      console.error("Error fetching nonce:", error);
      return 0;
    }
  }

  // Add a function to increment nonce after transaction
  async function incrementNonce(address) {
    try {
      // Normalize address for consistency
      const normalizedAddress = address.toLowerCase();
      let nonce = 0;

      try {
        const storedNonce = await db.get(`nonce:${normalizedAddress}`);
        nonce = parseInt(storedNonce, 10);

        // Check if nonce is valid
        if (isNaN(nonce)) {
          console.error(
            `Invalid stored nonce for ${normalizedAddress}: ${storedNonce}`
          );
          nonce = 0; // Reset to valid value
        }
      } catch (error) {
        // If key doesn't exist, default to 0
        nonce = 0;
      }

      // Increment nonce
      nonce += 1;

      // Store the new nonce
      await db.put(`nonce:${normalizedAddress}`, nonce.toString());
      console.log(`Incremented nonce for ${normalizedAddress} to ${nonce}`);

      return nonce;
    } catch (error) {
      console.error("Error incrementing nonce:", error);
      throw error;
    }
  }

  app.post("/", async (req, res) => {
    const { method, params, id } = req.body;

    const response = (result) => ({
        jsonrpc: "2.0",
        id: id || 1,
        result: JSON.parse(JSON.stringify(result, replacer)),
      });

    const errorResponse = (errorMsg) => ({
      jsonrpc: "2.0",
      id: id || 1,
      error: { code: -32601, message: errorMsg },
    });

    const toHex = (value) => {
      const num = Number(value);
      if (isNaN(num) || value === undefined || value === null) {
        return "0x0"; // Default to 0 if invalid
      }
      return `0x${Math.max(0, Math.floor(num)).toString(16)}`; // Ensure non-negative integer
    };

    try {
      switch (method) {
        case "eth_chainId":
          {
            const chainId = blockchain.getChainId();
            res.json(response(toHex(chainId)));
          }
          break;
        case "net_version":
          {
            const netVersion = String(blockchain.getChainId());
            res.json(response(netVersion));
          }
          break;
        case "eth_blockNumber":
          {
            const blockNumber = blockchain.chain.length - 1;
            // Format as hex with 0x prefix
            res.json(response(`0x${blockNumber.toString(16)}`));
          }
          break;
        case "eth_accounts":
          res.json(response([])); // No accounts, returning empty array
          break;
          case "eth_gasPrice": {
            const gasPrice = blockchain.getGasPrice(); // Implement dynamic pricing
            res.json(response(`0x${gasPrice.toString(16)}`));
            break;
        }
        
          case "eth_getLogs": {
            res.json(response(blockchain.logs));
            break;
        }
        case "eth_estimateGas":
          {
            const [tx] = params || [];
            if (!tx) {
              res.status(400).json(errorResponse("Transaction data required"));
              return;
            }
            const gasLimit = 21000; // Example: Default gas limit for a simple transfer
            res.json(response(`0x${gasLimit.toString(16)}`)); // Return gas limit as a hex string
          }
          break;
        // In api.js, modify your eth_getBalance handler:
        case "eth_getBalance":
          {
            const [address, block] = params || [];
            if (!address) {
              res.status(400).json(errorResponse("Address parameter required"));
              return;
            }
            try {
              const balance = await Balances.getBalance(address);
              console.log(
                `Balance for address ${address}: ${balance} (${balance.toString(
                  16
                )})`
              );

              // Format as hex with 0x prefix and ensure it's a proper hex string
              // This is critical for MetaMask compatibility
              const hexBalance = `0x${balance.toString(16)}`;
              res.json(response(hexBalance));
            } catch (error) {
              console.error("Error fetching balance:", error);
              res.status(500).json(errorResponse("Error fetching balance"));
            }
          }
          break;
          case "eth_getCode": {
            const [address] = params || [];
            if (!address) {
                res.status(400).json(errorResponse("Address required"));
                return;
            }
        
            console.log(`🔍 Searching for contract at address: ${address}`);
            console.log('📜 Available Contracts:', blockchain.contracts);
        
            if (blockchain.contracts[address]) {
                console.log(`✅ Contract found: ${address}`);
            } else {
                console.log(`❌ Contract not found: ${address}`);
            }
        
            res.json(response(blockchain.contracts[address] ? blockchain.contracts[address].bytecode : "0x"));
            break;
        }
        
        case "eth_getTransactionCount":
          {
            const [address, blockTag] = params || [];
            if (!address) {
              res.status(400).json(errorResponse("Address parameter required"));
              return;
            }

            try {
              const nonce = await getTransactionCount(address);
              const hexNonce = `0x${nonce.toString(16)}`;
              console.log(`Formatted nonce for ${address}: ${hexNonce}`);
              res.json(response(hexNonce));
            } catch (error) {
              console.error("Error in eth_getTransactionCount:", error);
              res.json(response("0x0"));
            }
          }
          break;
        case "eth_sendTransaction":
          {
            const [txData] = params || [];
            if (!txData) {
              res.status(400).json(errorResponse("Transaction data required"));
              return;
            }
            const { from, to, value, gas, gasPrice, data } = txData;
            const amount = parseInt(value, 16); // Convert value from hex to wei
            const transaction = new Transaction(
              from,
              to,
              { amount },
              gas,
              null,
              Date.now()
            );
            try {
              const txHash = await blockchain.processTransaction(transaction);
              p2pServer.broadcastTransaction(transaction);
              res.json(response(txHash));
            } catch (error) {
              res.status(400).json(errorResponse(error.message));
            }
          }
          break;
          case "eth_sendRawTransaction":
            {
                const [signedTx] = params || [];
                if (!signedTx) {
                    res
                        .status(400)
                        .json(errorResponse("Signed transaction data required"));
                    return;
                }
                try {
                    console.log("Received raw transaction:", signedTx);
                    
                    // Process transaction without mining
                    const txHash = await blockchain.processSignedTransaction(
                        signedTx
                    );
                    console.log("Transaction processed with hash:", txHash);
                    
                    // Make sure response is properly formatted for MetaMask
                    res.json(response(txHash));
          
                    // Broadcast to other nodes
                    p2pServer.broadcast({
                        type: "RAW_TRANSACTION",
                        rawTx: signedTx,
                    });
                    
                    // Note: We do NOT automatically mine a block here
                } catch (error) {
                    console.error("Error processing signed transaction:", error);
                    res.status(500).json(errorResponse(error.message));
                }
            }
            break;
          
          case "eth_getTransactionReceipt":
            {
              const [txHash] = params || [];
              if (!txHash) {
                res.status(400).json(errorResponse("Transaction hash parameter required"));
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
                        status: "0x1", // Example: Assume all transactions are successful
                        logs: [], // Example: No logs
                        logsBloom: "0x00", // Example: No logs
                        cumulativeGasUsed: toHex(21000), // Example: Fixed cumulative gas used
                        contractAddress: tx.receiver || null, // Return contract address if it's a contract deployment
                      };
                      break;
                    }
                  }
                  if (receipt) break;
                }
          
                if (receipt) {
                  res.json(response(receipt));
                } else {
                  res.status(404).json(errorResponse("Transaction not found"));
                }
              } catch (error) {
                console.error("Error fetching transaction receipt:", error);
                res.status(500).json(errorResponse("Server error"));
              }
            }
            break;
            case "eth_call": {
              const [txCall] = params || [];
              if (!txCall.to) {
                  res.status(400).json(errorResponse("Contract address required"));
                  return;
              }
          
              if (!blockchain.contracts[txCall.to]) {
                  res.json(response("0x"));
                  return;
              }
          
              const result = executeEVM(blockchain.contracts[txCall.to].bytecode);
              res.json(response(result));
              break;
          }
        case "eth_getBlockByNumber":
          {
            const [blockNumber, includeTx] = params || [];
            if (!blockNumber) {
              res
                .status(400)
                .json(errorResponse("Block number parameter required"));
              return;
            }
            const blockNum = parseInt(blockNumber, 16); // Convert hex to decimal
            if (blockNum >= blockchain.chain.length || blockNum < 0) {
              res.status(404).json(errorResponse("Block not found"));
              return;
            }
            const block = blockchain.chain[blockNum];
            const blockResponse = {
              number: toHex(blockNum),
              hash: block.hash,
              parentHash: block.previousHash,
              nonce: toHex(block.nonce),
              sha3Uncles:
                "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
              logsBloom: "0x00",
              transactionsRoot:
                "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
              stateRoot:
                "0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544",
              miner: block.minerReward ? "0xMinerAddress" : null,
              difficulty: toHex(blockchain.difficulty),
              totalDifficulty: toHex(blockchain.difficulty * blockNum),
              size: toHex(JSON.stringify(block, replacer).length),
              gasLimit: toHex(30000000),
              gasUsed: toHex(0),
              timestamp: toHex(block.timestamp),
              transactions: includeTx
                ? block.transactions.map((tx) => tx.calculateHash())
                : [],
              uncles: [],
            };
            res.json(response(blockResponse));
          }
          break;
        case "eth_getBlockByHash":
          {
            const [blockHash, includeTx] = params || [];
            if (!blockHash) {
              res
                .status(400)
                .json(errorResponse("Block hash parameter required"));
              return;
            }
            const block = blockchain.chain.find((b) => b.hash === blockHash);
            if (!block) {
              res.status(404).json(errorResponse("Block not found"));
              return;
            }
            const blockResponse = {
              number: toHex(block.index),
              hash: block.hash,
              parentHash: block.previousHash,
              nonce: toHex(block.nonce),
              sha3Uncles:
                "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
              logsBloom: "0x00",
              transactionsRoot:
                "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
              stateRoot:
                "0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544",
              miner: block.minerReward ? "0xMinerAddress" : null,
              difficulty: toHex(blockchain.difficulty),
              totalDifficulty: toHex(blockchain.difficulty * block.index),
              size: toHex(JSON.stringify(block, replacer).length),
              gasLimit: toHex(30000000),
              gasUsed: toHex(0),
              timestamp: toHex(block.timestamp),
              transactions: includeTx
                ? block.transactions.map((tx) => tx.calculateHash())
                : [],
              uncles: [],
            };
            res.json(response(blockResponse));
          }
          break;
        default:
          res.status(400).json(errorResponse("Method not supported"));
          break;
      }
    } catch (error) {
      console.error("RPC Error:", error);
      res.status(500).json({
        jsonrpc: "2.0",
        id: id || 1,
        error: { code: -32000, message: "Server error" },
      });
    }
  });

  app.post('/submit-data', async (req, res) => {
    const { sender, receiver, data, signature, timestamp, gasLimit } = req.body;

    console.log('Received request:', req.body);

    const transaction = new Transaction(
        sender,
        receiver,
        ethers.utils.toUtf8String(data), // Convert hex string back to UTF-8 string
        gasLimit,
        signature,
        timestamp
    );

    try {
        // Process the transaction without mining
        const txHash = await blockchain.processTransaction(transaction);
        p2pServer.broadcastTransaction(transaction);

        res.status(201).json({ 
            txHash, 
            message: 'Transaction processed successfully',
            pendingMining: true
        });
    } catch (error) {
        console.error('Transaction error:', error.message);
        res.status(400).json({ error: error.message });
    }
});


app.post('/mine-block', async (req, res) => {
  const { minerAddress } = req.body;
  
  if (!minerAddress) {
      return res.status(400).json({ error: 'Miner address is required' });
  }
  
  // Check if there are pending transactions
  if (!blockchain.hasPendingTransactions()) {
      return res.status(400).json({ 
          error: 'No pending transactions to mine', 
          success: false 
      });
  }
  
  try {
      const blockHash = await blockchain.minePendingTransactions(minerAddress);
      
      if (blockHash) {
          // Broadcast the updated chain to all connected peers
          p2pServer.broadcast({
              type: 'CHAIN',
              chain: blockchain.chain
          });
          
          return res.status(200).json({ 
              success: true, 
              blockHash,
              message: `Block successfully mined by ${minerAddress}`,
              reward: blockchain.miningReward / 10**18
          });
      } else {
          return res.status(400).json({ 
              success: false,
              message: 'Mining failed - no pending transactions' 
          });
      }
  } catch (error) {
      console.error('Mining error:', error);
      return res.status(500).json({ 
          success: false,
          error: error.message 
      });
  }
});

app.get("/pending-transactions", (req, res) => {
  res.json(blockchain.pendingTransactions);
});


app.get("/blocks", (req, res) => {
  const replacer = (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString(); // Convert BigInt to string
    }
    return value; // Return other types as is
  };
  
  const serializedChain = JSON.stringify(blockchain.chain, replacer);

  res.json(JSON.parse(serializedChain));
});

app.get("/transactions", (req, res) => {
  res.json(JSON.stringify(blockchain.getAllTransactions(), replacer));
});

  app.get("/balance/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const balance = await Balances.getBalance(address); // Balance is in wei
      const balanceInQRYPT = balance / 10 ** 18; // Convert wei to QRYPT
      res.json({ address, balance: balanceInQRYPT });
    } catch (error) {
      res.status(500).send("Error fetching balance");
    }
  });

  app.get("/transaction/:txHash", (req, res) => {
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
            status: "Confirmed",
            timestamp: block.timestamp,
          });
          return;
        }
      }
    }
    res.status(404).json({ error: "Transaction not found" });
  });

  app.post("/faucet", async (req, res) => {
    const { address } = req.body;
    const amount = 1000 * 10 ** 18; // 1000 QRYPT in wei
    console.log(`Faucet sending 1000 QRYPT to: ${address}`);

    try {
      await Balances.updateBalance(address, amount);
      res.json({ success: true, message: "1000 QRYPT tokens sent" });
    } catch (error) {
      console.error("Error processing faucet request:", error);
      res.status(500).json({ error: error.message });
    }
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
