import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Blocks from './pages/Blocks';
import Transactions from './pages/Transactions';
import Rewards from './pages/Rewards';
import Login from './pages/Login';

const App = () => {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/blocks" element={<Blocks />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/login" element={<Login />} />
            </Routes>
        </Router>
    );
};

export default App;