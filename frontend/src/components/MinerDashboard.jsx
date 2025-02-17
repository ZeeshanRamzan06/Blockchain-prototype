import React, { useState } from 'react';
import axios from 'axios';

const MinerDashboard = () => {
    const [data, setData] = useState('');
    const [receiver, setReceiver] = useState('');
    const [signature, setSignature] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const sender = localStorage.getItem('publicKey'); // Get miner's public key from login
        const response = await axios.post('http://localhost:6001/submit-data', {
            sender,
            receiver,
            data,
            signature,
            miner: sender
        });
        alert(response.data);
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Submit Data</h2>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <label className="block text-gray-700">Receiver</label>
                    <input
                        type="text"
                        placeholder="Receiver"
                        value={receiver}
                        onChange={(e) => setReceiver(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700">Data</label>
                    <textarea
                        placeholder="Data"
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Submit
                </button>
            </form>
        </div>
    );
};

export default MinerDashboard;