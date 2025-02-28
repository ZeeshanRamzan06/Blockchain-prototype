import { Level } from 'level';

const db = new Level('./balances'); // Database to store balances

class Balances {
    static async getBalance(address) {
        try {
            const balance = await db.get(address);
            const num = BigInt(balance); // Use BigInt for large numbers
            console.log(`Retrieved balance for ${address}: ${num}`);
            return num; // Return raw wei value (no decimal conversion)
        } catch (error) {
            console.log(`Balance not found for ${address}, returning 0`);
            return BigInt(0); // Default to 0 wei
        }
    }

    // Update the balance of a user
    static async updateBalance(address, amount) {
        if (!address || typeof address !== 'string' || address.trim() === '') {
            throw new Error('Invalid address: cannot be null, undefined, or empty');
        }
        
        try {
            const currentBalance = await this.getBalance(address);
            
            // Convert amount to BigInt if it's not already
            const amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount);
            
            // Calculate new balance
            const newBalance = currentBalance + amountBigInt;
            
            // Check for negative balance
            if (newBalance < 0) {
                throw new Error('Insufficient balance');
            }
            
            // Store the balance as a string representation of BigInt
            await db.put(address, newBalance.toString());
            console.log(`Updated balance for ${address}: ${newBalance}`);
            return newBalance;
        } catch (error) {
            console.error(`Error updating balance for ${address}:`, error);
            throw error;
        }
    }
}

export default Balances;