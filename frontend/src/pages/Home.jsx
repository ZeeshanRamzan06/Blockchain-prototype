import React from 'react';
import { Link } from 'react-router-dom';
import MinerDashboard from '../components/MinerDashboard';

const Home = () => {
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4">Welcome to the Blockchain Explorer</h1>
            <p className="text-gray-700 mb-6">
                Explore the latest blocks, transactions, and miner rewards on the blockchain.
            </p>
        </div>
    );
};

export default Home;