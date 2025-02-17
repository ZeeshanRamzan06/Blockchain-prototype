import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Rewards = () => {
    const [rewards, setRewards] = useState(0);

    useEffect(() => {
        const publicKey = localStorage.getItem('publicKey');
        if (publicKey) {
            axios.get(`http://localhost:6001/rewards?miner=${publicKey}`)
                .then(response => setRewards(response.data.rewards))
                .catch(error => console.error(error));
        }
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Miner Rewards</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-700"><span className="font-bold">Total Rewards:</span> {rewards} tokens</p>
            </div>
        </div>
    );
};

export default Rewards;