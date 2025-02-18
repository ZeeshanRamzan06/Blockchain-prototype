import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

const MinerDashboard = () => {
    const [walletAddress, setWalletAddress] = useState('');
    const [fileData, setFileData] = useState(null);
    const [textData, setTextData] = useState('');
    const [receiver, setReceiver] = useState('');
    const [error, setError] = useState('');
    const [miningStatus, setMiningStatus] = useState('');
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        checkIfWalletIsConnected();
    }, []);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check file size (50MB = 50 * 1024 * 1024 bytes)
            if (file.size > 50 * 1024 * 1024) {
                setError('File size exceeds 50MB limit');
                event.target.value = ''; // Reset file input
                return;
            }
    
            const reader = new FileReader();
            reader.onload = (e) => {
                setFileData(e.target.result);
                setError(''); // Clear any previous errors
            };
            reader.onerror = () => {
                setError('Error reading file');
            };
            reader.readAsText(file);
        }
    };

    const checkIfWalletIsConnected = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                setError('Please install MetaMask!');
                return;
            }

            const accounts = await ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                fetchBalance(accounts[0]);
            }
        } catch (error) {
            console.error(error);
            setError('Error connecting to MetaMask');
        }
    };

    const connectWallet = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                setError('Please install MetaMask!');
                return;
            }

            const accounts = await ethereum.request({
                method: 'eth_requestAccounts'
            });
            setWalletAddress(accounts[0]);
            fetchBalance(accounts[0]);
        } catch (error) {
            console.error(error);
            setError('Error connecting to MetaMask');
        }
    };

    const fetchBalance = async (address) => {
        try {
            const response = await axios.get(`http://localhost:6001/balance/${address}`);
            setBalance(response.data.balance);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    const signAndSubmitData = async () => {
        try {
            if (!window.ethereum) {
                setError('Please install MetaMask!');
                return;
            }
    
            const data = fileData || textData;
            if (!data) {
                setError('Please provide data to submit');
                return;
            }
    
            if (!receiver) {
                setError('Please provide a receiver address');
                return;
            }
    
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
    
            setMiningStatus('Preparing transaction...');
    
            // Get the actual sender address
            const sender = await signer.getAddress();
    
            // Create message to sign
            const messageToSign = JSON.stringify({
                sender: sender,
                receiver: receiver,
                data: data,
                timestamp: Date.now()
            });
    
            // Sign the message
            setMiningStatus('Please sign the transaction in MetaMask...');
            const signature = await signer.signMessage(messageToSign);
    
            // Submit to blockchain
            setMiningStatus('Submitting transaction...');
            const response = await axios.post('http://localhost:6001/submit-data', {
                sender: sender,
                receiver: receiver,
                data: data,
                signature: signature,
                miner: sender,
                timestamp: JSON.parse(messageToSign).timestamp // Include the same timestamp
            });
    
            setMiningStatus('Transaction successful!');
            // Refresh balance after mining
            fetchBalance(sender);
            
            // Clear form
            setFileData(null);
            setTextData('');
            setReceiver('');
            
            // Reset file input if it exists
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.value = '';
            }
        } catch (error) {
            console.error('Error:', error);
            if (error.response?.data) {
                setError(`Transaction failed: ${error.response.data}`);
            } else {
                setError(`Error: ${error.message}`);
            }
            setMiningStatus('');
        }
    };
    

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Miner Dashboard</h2>
            
            {/* Wallet Connection Section */}
            <div className="border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Step 1: Connect MetaMask</h3>
                {!walletAddress ? (
                    <button
                        onClick={connectWallet}
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Connect MetaMask
                    </button>
                ) : (
                    <div>
                        <p className="text-green-600 font-medium">
                            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                        </p>
                        <p className="mt-2">Balance: {balance} tokens</p>
                    </div>
                )}
            </div>

            {/* Data Upload Section */}
            <div className="border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Step 2: Upload Data</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Upload File</label>
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Or Enter Text</label>
                        <textarea
                            value={textData}
                            onChange={(e) => setTextData(e.target.value)}
                            className="w-full border p-2 rounded h-24 resize-none"
                            placeholder="Enter your data here..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Receiver Address</label>
                        <input
                            type="text"
                            value={receiver}
                            onChange={(e) => setReceiver(e.target.value)}
                            className="w-full border p-2 rounded"
                            placeholder="0x..."
                        />
                    </div>
                </div>
            </div>

            {/* Submit and Mine Section */}
            <div className="border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Step 3: Sign and Mine</h3>
                <button
                    onClick={signAndSubmitData}
                    disabled={!walletAddress || (!fileData && !textData)}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Sign and Mine Block
                </button>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}
            
            {miningStatus && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
                    {miningStatus}
                </div>
            )}
        </div>
    );
};

export default MinerDashboard;