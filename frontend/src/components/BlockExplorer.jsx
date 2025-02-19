import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BlockExplorer = () => {
    const [blocks, setBlocks] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:6001/blocks')
            .then(response => setBlocks(response.data))
            .catch(error => console.error(error));
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Latest Blocks</h2>
            <div className="space-y-4">
                {blocks.map(block => (
                    <div key={block.hash} className="bg-white p-4 rounded-lg shadow-md">
                        <p className="text-gray-700"><span className="font-bold">Index:</span> {block.index}</p>
                        <p className="text-gray-700"><span className="font-bold">Hash:</span> {block.hash}</p>
                        <p className="text-gray-700"><span className="font-bold">Transactions:</span> {block.transactions.length}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BlockExplorer;