import React, { useState } from 'react';

const Login = () => {
    const [privateKey, setPrivateKey] = useState('');

    const handleLogin = () => {
        // Validate private key and set public key in localStorage
        localStorage.setItem('privateKey', privateKey);
        alert('Logged in successfully!');
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Login</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <label className="block text-gray-700">Private Key</label>
                    <input
                        type="text"
                        placeholder="Enter your private key"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Login
                </button>
            </div>
        </div>
    );
};

export default Login;