import { Level } from 'level';

const db = new Level('./balances'); // Database to store balances

class Balances {
    static async openDatabase() {
        try {
            if (db.status !== 'open') {
                await db.open();
                console.log('Balances database opened successfully');
            }
        } catch (error) {
            console.error('Failed to open balances database:', error);
            throw new Error('Balances database failed to open');
        }
    }

    static async getBalance(address) {
        // Normalize address to lowercase
        const normalizedAddress = address.toLowerCase();
        await this.openDatabase(); // Ensure database is open
        try {
            const balance = await db.get(normalizedAddress);
            const num = BigInt(balance); // Use BigInt for large numbers
            console.log(`Retrieved balance for ${normalizedAddress}: ${num}`);
            return num; // Return raw wei value (no decimal conversion)
        } catch (error) {
            console.log(`Balance not found for ${normalizedAddress}, returning 0`);
            return BigInt(0); // Default to 0 wei
        }
    }

    // Update the balance of a user
    static async updateBalance(address, amount) {
        // Normalize address to lowercase
        const normalizedAddress = address.toLowerCase();
        await this.openDatabase(); // Ensure database is open
        if (!normalizedAddress || typeof normalizedAddress !== 'string' || normalizedAddress.trim() === '') {
            throw new Error('Invalid address: cannot be null, undefined, or empty');
        }
        
        try {
            const currentBalance = await this.getBalance(normalizedAddress);
            
            // Convert amount to BigInt if it's not already
            const amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount);
            
            // Calculate new balance
            const newBalance = currentBalance + amountBigInt;
            
            // Check for negative balance
            if (newBalance < 0) {
                throw new Error('Insufficient balance');
            }
            
            // Store the balance as a string representation of BigInt
            await db.put(normalizedAddress, newBalance.toString());
            console.log(`Updated balance for ${normalizedAddress}: ${newBalance}`);
            return newBalance;
        } catch (error) {
            console.error(`Error updating balance for ${normalizedAddress}:`, error);
            throw error;
        }
    }
}

export default Balances;