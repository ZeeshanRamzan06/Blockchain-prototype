import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:6001/transactions')
            .then(response => setTransactions(response.data))
            .catch(error => console.error(error));
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Latest Transactions</h2>
            <div className="space-y-4">
                {transactions.map((tx, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                        <p className="text-gray-700"><span className="font-bold">Sender:</span> {tx.sender}</p>
                        <p className="text-gray-700"><span className="font-bold">Receiver:</span> {tx.receiver}</p>
                        <p className="text-gray-700"><span className="font-bold">Data:</span> {tx.data}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Transactions;