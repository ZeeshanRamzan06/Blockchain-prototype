import React, { useState } from 'react';
import axios from 'axios';

const Faucet = () => {
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const requestTokens = async () => {
    if (!address) {
      setMessage('Please enter a valid wallet address.');
      return;
    }
    
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:6001/faucet', { address});
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to request tokens. Try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-semibold text-center mb-2">QRYPT Faucet</h2>
        <p className="text-gray-600 text-center mb-4">Enter your wallet address to receive 1000 QRYPT tokens.</p>
        <input
          type="text"
          placeholder="Enter your wallet address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={requestTokens}
          disabled={loading}
          className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Requesting...' : 'Get Tokens'}
        </button>
        {message && <p className="mt-4 text-center text-green-600">{message}</p>}
      </div>
    </div>
  );
};

export default Faucet;
