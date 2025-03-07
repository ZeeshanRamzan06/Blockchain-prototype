import axios from 'axios';

class AIValidationService {
    constructor(apiUrl = 'https://qryptum-ai.onrender.com') {
        this.apiUrl = apiUrl;
        this.apiEndpoint = `${this.apiUrl}/api/validate`;
    }

    /**
     * Validates data using the Qryptum AI API
     * @param {string} data - The data to validate
     * @param {string} walletAddress - The miner's wallet address
     * @returns {Promise<Object>} - Validation results including score and uniqueness
     */
    async validateData(data, walletAddress) {
        try {
            console.log(`Submitting data to AI validation service from ${walletAddress}`);
            
            const response = await axios.post(this.apiEndpoint, {
                data: data,
                miner: walletAddress
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true // Ensure credentials are included in CORS requests
            });
            
            console.log('AI validation response:', response.data);
            return response.data;
        } catch (error) {
            console.error('AI Validation Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error || 'AI validation failed');
        }
    }

    /**
     * Calculate mining reward based on AI score
     * @param {number} score - The AI validation score (0-100)
     * @param {number} baseReward - Base mining reward (in wei)
     * @returns {bigint} - Adjusted reward based on quality score
     */
    calculateRewardFromScore(score, baseReward) {
        // Ensure score is between 0 and 100
        const normalizedScore = Math.max(0, Math.min(100, score));
        
        // Calculate reward multiplier (0.1 to 2x based on score)
        // Score 0 = 10% of base reward
        // Score 50 = 100% of base reward (1x)
        // Score 100 = 200% of base reward (2x)
        const multiplier = 0.1 + (normalizedScore / 50) * 0.9;
        
        // Apply multiplier to base reward
        const adjustedReward = BigInt(Math.floor(Number(baseReward) * multiplier));
        
        console.log(`Score: ${normalizedScore}, Multiplier: ${multiplier}x, Reward: ${adjustedReward}`);
        return adjustedReward;
    }
}

export default AIValidationService;