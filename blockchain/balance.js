import level from 'level';

const db = level('./balances'); // Database to store miner balances

class Balances {
    // Get the balance of a miner
    static async getBalance(publicKey) {
        try {
            const balance = await db.get(publicKey);
            return parseInt(balance, 10);
        } catch (error) {
            return 0; // If the miner doesn't exist, return 0
        }
    }

    // Update the balance of a miner
    static async updateBalance(publicKey, amount) {
        const currentBalance = await this.getBalance(publicKey);
        await db.put(publicKey, currentBalance + amount);
    }
}

export default Balances;