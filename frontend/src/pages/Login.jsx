import React, { useState } from 'react';
import Web3 from 'web3';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const web3 = new Web3(window.ethereum);

                // Get the user's Ethereum address
                const accounts = await web3.eth.getAccounts();
                const userAddress = accounts[0];

                // Save the address to localStorage
                localStorage.setItem('userAddress', userAddress);

                // Redirect to the Miner Dashboard
                navigate('/miner-dashboard');
            } catch (err) {
                setError('Failed to connect to MetaMask.');
                console.error(err);
            }
        } else {
            setError('MetaMask is not installed. Please install it to use this feature.');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Login with MetaMask</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <button
                    onClick={connectWallet}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Connect MetaMask
                </button>
                {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
        </div>
    );
};

export default Login;