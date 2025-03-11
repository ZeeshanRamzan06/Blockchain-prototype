import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BlockExplorer = () => {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://localhost:6001/blocks')
            .then(response => {
                console.log('API Response:', response.data);
                setBlocks(Array.isArray(response.data) ? response.data : []);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching blocks:', error);
                setLoading(false);
               
            });
    }, []);
    

    if (loading) {
        return <div className="container mx-auto p-4">Loading...</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Latest Blocks</h2>
            <div className="space-y-4">
                {blocks.map(block => (
                    <div key={block.hash} className="bg-white p-4 rounded-lg shadow-md">
                        <p className="text-gray-700"><span className="font-bold">Index:</span> {block.index}</p>
                        <p className="text-gray-700"><span className="font-bold">Hash:</span> {block.hash}</p>
                        <p className="text-gray-700"><span className="font-bold">Previous Hash:</span> {block.previousHash}</p>
                        <p className="text-gray-700"><span className="font-bold">Transactions:</span> {block.transactions.length}</p>
                        <p className="text-gray-700"><span className="font-bold">Timestamp:</span> {block.timestamp}</p>
                        <p className="text-gray-700"><span className="font-bold">Nonce:</span> {block.nonce}</p>
                        <p className="text-gray-700"><span className="font-bold">Miner Reward:</span> {block.minerReward}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BlockExplorer;