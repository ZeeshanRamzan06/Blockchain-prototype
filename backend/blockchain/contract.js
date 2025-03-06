import { ethers } from 'ethers';

class Contract {
    constructor(address, owner, code, storage = {}) {
        this.address = address;  // Contract Address
        this.owner = owner;      // Deployer
        this.code = code;        // Contract Bytecode (simplified)
        this.storage = storage;  // Persistent contract state
    }

    // Store a value in contract storage
    setStorage(key, value) {
        this.storage[key] = value;
    }

    // Retrieve value from contract storage
    getStorage(key) {
        return this.storage[key] || null;
    }
}

export default Contract;
