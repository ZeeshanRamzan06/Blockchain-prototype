// In MinerDashboard.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

const MinerDashboard = () => {
    const [walletAddress, setWalletAddress] = useState('');
    const [fileData, setFileData] = useState(null);
    const [textData, setTextData] = useState('');
    const [error, setError] = useState('');
    const [miningStatus, setMiningStatus] = useState('');
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        checkIfWalletIsConnected();
    }, []);

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
                await fetchBalance(accounts[0]);
            }
        } catch (error) {
            setError('Error connecting to MetaMask');
        }
    };

    const connectWallet = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) throw new Error('Please install MetaMask!');
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            setWalletAddress(address);
            await fetchBalance(address);
        } catch (error) {
            setError(error.message);
        }
    };

    const fetchBalance = async (address) => {
        try {
            const provider = new ethers.providers.JsonRpcProvider('http://localhost:6001');
            const balance = await provider.getBalance(address);
            setBalance(parseFloat(ethers.utils.formatUnits(balance, 18)));
        } catch (error) {
            setError('Error fetching balance');
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

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const sender = await signer.getAddress();

            setMiningStatus('Preparing transaction...');

            const nonce = await provider.getTransactionCount(sender);
            const tx = {
                from: sender,
                to: null, // No receiver for data submission
                value: 0,
                gasLimit: ethers.utils.hexlify(21000),
                gasPrice: ethers.utils.hexlify(10 * 10 ** 9), // 10 Gwei
                data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(data)),
                nonce: ethers.utils.hexlify(nonce),
                chainId: blockchain.chainId
            };

            setMiningStatus('Please sign the transaction in MetaMask...');
            const signedTx = await signer.signTransaction(tx);

            setMiningStatus('Submitting transaction and validating with AI...');
            const submitResponse = await axios.post('http://localhost:6001/', {
                jsonrpc: '2.0',
                method: 'eth_sendRawTransaction',
                params: [signedTx],
                id: 1
            });

            const txHash = submitResponse.data.result;
            setMiningStatus(`Transaction submitted: ${txHash}`);

            // Trigger mining
            setMiningStatus('Mining block...');
            const mineResponse = await axios.post('http://localhost:6001/mine-block', { minerAddress: sender });
            if (mineResponse.data.success) {
                setMiningStatus(`Block mined successfully! Hash: ${mineResponse.data.blockHash}, Reward: ${mineResponse.data.reward} QRY`);
            } else {
                setMiningStatus('No block mined; score may be below 50%');
            }

            await fetchBalance(sender);
            setFileData(null);
            setTextData('');
            document.querySelector('input[type="file"]').value = '';
        } catch (error) {
            console.error('Error:', error);
            setError(error.response?.data?.error?.message || error.message);
            setMiningStatus('');
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Qryptum Miner Dashboard</h2>
            <div className="border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Step 1: Connect MetaMask</h3>
                {!walletAddress ? (
                    <button onClick={connectWallet} className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Connect MetaMask
                    </button>
                ) : (
                    <div>
                        <p className="text-green-600 font-medium">Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
                        <p className="mt-2">Balance: {balance} QRY</p>
                    </div>
                )}
            </div>
            <div className="border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Step 2: Upload Data</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Upload File</label>
                        <input type="file" onChange={handleFileUpload} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Or Enter Text</label>
                        <textarea value={textData} onChange={(e) => setTextData(e.target.value)} className="w-full border p-2 rounded h-24 resize-none" placeholder="Enter your data here..." />
                    </div>
                </div>
            </div>
            <div className="border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Step 3: Submit and Mine</h3>
                <button onClick={signAndSubmitData} disabled={!walletAddress || (!fileData && !textData)} className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                    Submit Data and Mine
                </button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>}
            {miningStatus && <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">{miningStatus}</div>}
        </div>
    );
};

export default MinerDashboard;  