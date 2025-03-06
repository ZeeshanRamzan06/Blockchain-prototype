import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        axios.get('http://localhost:6001/transactions')
            .then(response => {
        
                let parsedData = response.data;
                if (typeof response.data === 'string') {
                    try {
                        parsedData = JSON.parse(response.data);
                    } catch (e) {
                        console.error('Error parsing response data:', e);
                    }
                }
                setTransactions(Array.isArray(parsedData) ? parsedData : []);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching transactions:', error);
                setError(error.message || 'Error fetching transactions');
                setLoading(false); // Move this inside the catch block
            });
    }, []);

    if (loading) return <div className="container mx-auto p-4">Loading transactions...</div>;
    if (error) return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>;
    if (transactions.length === 0) return <div className="container mx-auto p-4">No transactions found.</div>;

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Latest Transactions</h2>
            <div className="space-y-4">
                {transactions.map((tx, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                        <p className="text-gray-700"><span className="font-bold">Sender:</span> {tx.sender}</p>
                        <p className="text-gray-700"><span className="font-bold">Receiver:</span> {tx.receiver}</p>
                        <p className="text-gray-700"><span className="font-bold">Data:</span> {typeof tx.data === 'object' ? JSON.stringify(tx.data) : tx.data}</p>
                        <p className="text-gray-700"><span className="font-bold">Timestamp:</span> {new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Transactions;