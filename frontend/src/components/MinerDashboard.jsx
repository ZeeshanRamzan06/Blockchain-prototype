import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

const MinerDashboard = () => {
    const [walletAddress, setWalletAddress] = useState('');
    const [fileData, setFileData] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [textData, setTextData] = useState('');
    const [error, setError] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [miningStatus, setMiningStatus] = useState('');
    const [balance, setBalance] = useState(0);
    const [userScore, setUserScore] = useState(null);
    const [uploadResponse, setUploadResponse] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        checkIfWalletIsConnected();
    }, []);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                setError('File size exceeds 50MB limit');
                event.target.value = '';
                return;
            }
    
            setSelectedFile(file);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                setFileData(e.target.result);
                setError('');
            };
            reader.onerror = () => setError('Error reading file');
            reader.readAsText(file);
            
            // Reset states when a new file is uploaded
            setUserScore(null);
            setUploadResponse(null);
            setUploadStatus('');
            setMiningStatus('');
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
                await fetchBalance(accounts[0]);
            }
        } catch (error) {
            console.error(error);
            setError('Error connecting to MetaMask');
        }
    };

    const connectWallet = async () => {
        try {
            const metamask = window.ethereum;
            if (!metamask) {
                throw new Error('Please install MetaMask!');
            }

            const accounts = await metamask.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }

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
            setBalance(parseFloat(ethers.utils.formatUnits(balance, 18))); // Convert wei to QRYPT (18 decimals)
        } catch (error) {
            console.error('Error fetching balance:', error);
            setError('Error fetching balance');
        }
    };

    const uploadData = async () => {
        try {
            if (!selectedFile && !textData) {
                setError('Please provide data to submit');
                return;
            }

            setIsUploading(true);
            setUploadStatus('Uploading and analyzing data...');
            setError('');

            // Use FormData for file upload
            const formData = new FormData();
            
            if (selectedFile) {
                formData.append('file', selectedFile);
            } else if (textData) {
                // Create a text file from the text input
                const textBlob = new Blob([textData], { type: 'text/plain' });
                const textFile = new File([textBlob], 'user_input.txt', { type: 'text/plain' });
                formData.append('file', textFile);
            }

            const response = await axios.post('/api/upload/', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              });
              
            console.log('Upload response:', response.data);
            
            // Extract score from response - now also checking for uniqueness_score
            const score = response.data.score || 
                          response.data.uniqueness || 
                          response.data.uniqueness_score || 
                          (response.data.analysis ? response.data.analysis.score : null);
            
            if (score !== null && score !== undefined) {
                setUserScore(score);
                setUploadResponse(response.data);
                
                if (score > 50) {
                    setUploadStatus(`Data analyzed successfully! Your uniqueness score: ${score}%. You can now mine a block.`);
                } else {
                    setUploadStatus(`Data analyzed successfully! Your uniqueness score: ${score}%. Score must be greater than 50% to mine a block.`);
                }
            } else {
                // If score is not directly in the response, store the whole response
                setUploadResponse(response.data);
                setUploadStatus('Data uploaded and analyzed successfully!');
            }
            
        } catch (error) {
            console.error('Error uploading:', error);
            if (error.response?.data) {
                setError(`Upload failed: ${error.response.data.error || JSON.stringify(error.response.data)}`);
            } else {
                setError(`Error: ${error.message}`);
            }
            setUploadStatus('');
        } finally {
            setIsUploading(false);
        }
    };

    const signAndMineBlock = async () => {
        try {
            if (!window.ethereum) {
                setError('Please install MetaMask!');
                return;
            }

            if (!uploadResponse) {
                setError('Please upload and analyze data first');
                return;
            }

            // Check if score is available and meets threshold
            if (userScore === null || userScore <= 50) {
                setError('Your data uniqueness score must be greater than 50% to mine a block');
                return;
            }

            setMiningStatus('Preparing transaction...');
            setError('');
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const sender = await signer.getAddress();
            
            const timestamp = Date.now();
            const messageToSign = JSON.stringify({
                sender: sender,
                data: uploadResponse,
                score: userScore,
                timestamp: timestamp
            });
            
            setMiningStatus('Please sign the transaction in MetaMask...');
            const signature = await signer.signMessage(messageToSign);
            
            setMiningStatus('Mining block...');
            
            const tx = {
                from: sender,
                to: null, // Contract deployment
                data: ethers.utils.toUtf8Bytes(messageToSign),
                gasLimit: ethers.utils.hexlify(3000000), // Example gas limit
                value: ethers.utils.parseEther('0') // No value for contract deployment
            };
            
            const txResponse = await signer.sendTransaction(tx);
            const receipt = await txResponse.wait();
            
            setMiningStatus(`Block mined successfully! TX Hash: ${receipt.transactionHash}`);
            await fetchBalance(sender);
            
        } catch (error) {
            console.error('Error:', error);
            if (error.response?.data) {
                setError(`Transaction failed: ${error.response.data.error || JSON.stringify(error.response.data)}`);
            } else {
                setError(`Error: ${error.message}`);
            }
            setMiningStatus('');
        }
    };

    const resetForm = () => {
        setFileData(null);
        setSelectedFile(null);
        setTextData('');
        setUserScore(null);
        setUploadResponse(null);
        setUploadStatus('');
        setMiningStatus('');
        setError('');
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
    };

    // Helper function to display the response
    const displayResponse = () => {
        if (!uploadResponse) return null;
        
        if (typeof uploadResponse === 'object') {
            return (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border overflow-auto max-h-64">
                    <h4 className="font-medium mb-2">Response Details:</h4>
                    <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(uploadResponse, null, 2)}
                    </pre>
                </div>
            );
        } else {
            return (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <p>{uploadResponse}</p>
                </div>
            );
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
                        <p className="mt-2">Balance: {balance} QRYPT</p>
                    </div>
                )}
            </div>

            {/* Data Upload Section */}
            <div className="border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Step 2: Upload & Analyze Data</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Upload File</label>
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            className="w-full border p-2 rounded"
                            disabled={isUploading}
                        />
                    </div>
                    <button
                        onClick={uploadData}
                        disabled={!walletAddress || (!selectedFile && !textData) || isUploading}
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isUploading ? 'Uploading & Analyzing...' : 'Upload & Analyze Data'}
                    </button>
                </div>
            </div>

            {/* User Score Section */}
            {userScore !== null && (
                <div className={`border rounded-lg p-4 mb-6 ${userScore > 50 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <h3 className="text-lg font-medium mb-2">Your Data Uniqueness Score</h3>
                    <div className={`text-4xl font-bold ${userScore > 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {userScore}%
                    </div>
                    <p className="mt-2 text-sm">
                        {userScore > 50 
                            ? 'Your data meets the uniqueness threshold! You can now mine a block.' 
                            : 'Your data does not meet the required uniqueness threshold of greater than 50%.'}
                    </p>
                    
                    {/* Display full response */}
                    {displayResponse()}
                </div>
            )}

            {/* Mine Block Section */}
            <div className="border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Step 3: Sign and Mine Block</h3>
                <button
                    onClick={signAndMineBlock}
                    disabled={!walletAddress || !uploadResponse || userScore === null || userScore <= 50}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Sign and Mine Block
                </button>
            </div>

            {/* Reset Button */}
            <div className="mb-6">
                <button
                    onClick={resetForm}
                    className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Reset Form
                </button>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}
            
            {uploadStatus && (
                <div className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-lg mb-4">
                    {uploadStatus}
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