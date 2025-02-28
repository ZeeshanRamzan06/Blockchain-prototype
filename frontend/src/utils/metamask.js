const MetaMaskIntegration = {
    connectWallet: async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                throw new Error('Please install MetaMask!');
            }

            const accounts = await ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }

            return accounts[0];
        } catch (error) {
            throw new Error(`Failed to connect wallet: ${error.message}`);
        }
    }
};

export default MetaMaskIntegration;
