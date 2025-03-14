import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    const [userAddress, setUserAddress] = useState('');

    useEffect(() => {
        const address = localStorage.getItem('userAddress');
        if (address) {
            setUserAddress(address);
        }
    }, []);

    return (
        <nav className="bg-blue-600 p-4 text-white">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold">Block Explorer</Link>
                <div className="space-x-4">
                    <Link to="/blocks" className="hover:text-blue-200">Blocks</Link>
                    <Link to="/transactions" className="hover:text-blue-200">Transactions</Link>
                    <Link to="/rewards" className="hover:text-blue-200">Rewards</Link>
                    {userAddress ? (
                        <span className="bg-blue-500 px-4 py-2 rounded">{userAddress.slice(0, 6)}...</span>
                    ) : (
                        <Link to="/login" className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-700">Login</Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;