// TODO: Add more error handling, it works now but I believe it can break any time

const { block, tools, wallet } = require('nanocurrency-web');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/*
* Default settings
* Feel free to edit if hosting your own payment gateway
*/
const DEFAULTS = {
    representative: "nano_1b9wguhh39at8qtm93oghd6r4f4ubk7zmqc9oi5ape6yyz4s1gamuwn3jjit", // Default representative, used if the address doesn't have one (which in case of payment gateway, should NOT)
    frontier: "0000000000000000000000000000000000000000000000000000000000000000",        // Default frontier if fetching the last one goes wrong (which always happens if an account didn't send or receive any transactions)
    rpc: "https://nano.a.exodus.io/",                                                    // The default RPC server used by the Wallet, Why Exodus? No limit on requests
    invokeOptions: {                                                                     // Options used in every request
        method: "POST",
        headers: {'Accept': "application/json, text/plain, */*",'Content-Type': 'application/json'}
    },
    
};

class Wallet {
    server = DEFAULTS.rpc;

    static generateSeed = () => Array.from(Array(8).keys()).map(x=>(Math.floor(Math.random()*9999999999-1000000000)*100000000).toString("16").substring(0,12).replace(/-/gm,"")).join("").substring(4,68);

    /**
     * Sends request to the RPC server
     * @throws {error} if body parameter isn't an object
     * @param {object} body JS object (not JSON) of the body
     */
    async invoke(body) {
        if(typeof body != "object") throw Error("'body' parameter in the invoke method MUST be a JS object, received:"+(typeof body))
        return (await fetch(this.server||DEFAULTS.rpc, {
            ...DEFAULTS.invokeOptions,
            body: JSON.stringify(body)
        }));
    }


    /**
     * Creates a new instance of the Wallet class using seed and index of the Wallet
     * @param {string} seed 64 characters long seed of the Wallet
     * @param {number} index Index of the Address <0, 4294967295>
     * @throws {error} If any of the given parameters were bad
     * @returns {Wallet}
     */
    static new(seed, index) {
        if ( (typeof index != "number" && typeof index != "bigint") || (index > 4294967295 || index < 0) ) throw Error("Invalid index")
        if (typeof seed != "string" || seed.length != 64) throw Error("Invalid seed");

        let account = wallet.legacyAccounts(seed, index, index)?.[0];

        if (account?.privateKey === undefined) throw Error("Something went wrong while obtaining address (perhaps the seed was invalid?)");
        return new Wallet(account.privateKey, account.address);
    }

    /**
     * Creates a new instance of the Wallet class using private key and Wallet address.
     * @param {string} key Private key of your wallet
     * @param {string} address The address of the wallet
     * @throws {Error} If the wallet is invalid or the key is not a 64-character string.
     * @returns {Wallet}
     */
    constructor(key, address) {
        if (typeof key != "string" || key.length != 64) throw Error("Invalid private key");
        if (!tools.validateAddress(address)) throw Error("Invalid NANO address");
        this.key = key;
        this.address = address;
        this.publicKey = tools.addressToPublicKey(address);
    }


    

    /**
     * This function has to be run at least once.
     * It validates gets the representative of the address provided
     * @returns {Wallet}
     */
    async validate() {
        this.representative = (await this.get_representative());
        return this;
    }

    /**
     * This function obtains the account_info of the Wallet
     * @returns {object} account_info
     */
    async account_info() {
        let response = await this.invoke({action: "account_info",account: this.address});
        return (await response.json());
    }

    /**
     * 
     * @param {string} frontier 64 character long hash number
     * @returns {object} JS object containing blocks
     */
    async blocks_info(frontier) {
        if (frontier?.length != 64) throw new Error("Bad hash number");
        let body = {
            action: "blocks_info",
            hashes: [frontier]
        };
        let response = await this.invoke(body);
        return (await response.json());
    }

    /**
     * This function is self explanatory
     * @returns All the pending blocks
     */
    async pending() {
        let body = {
            "account": this.address,
            "count": 50,
            "threshold": "1000000000000000000000000",
            "source": true,
            "include_only_confirmed": true,
            "action": "pending"
        }
        let response = await this.invoke(body);
        return (await response.json());
    }


    async receive_all(pending=null) {
        if(pending==null) pending = (await this.pending());
        pending = pending?.blocks;
        let successArray = [];

        if ((pending || []).length == 0) return [];

        for (let i in pending) {
            let info = await this.account_info();
            let block = await this.create_receive_block(info, i, pending[i].amount);

            let body = {
                "action": "process",
                "subtype": "receive",
                "block": JSON.stringify(block)
            }

            let response = await this.invoke(body);
            let json = await response.json();
            successArray.push(((json?.hash || "") != ""));
        }
        return successArray;
    }

    /**
     * Creates and signs a receive transaction block
     * @param {object} accountInfo account info of the current Wallet
     * @param {string} hash Last transaction hash
     * @param {number} amount amount IN RAW of the pending transaction
     * @returns {SignedBlock}
     */
    async create_receive_block(accountInfo, hash, amount) {
        const data = {
            walletBalanceRaw: (accountInfo.balance||"0"), // Current balance in RAW from account info
            toAddress: this.address, // Your address
            representativeAddress: (this.representative||DEFAULTS.representative), // Address of the representative
            frontier: (accountInfo.frontier||DEFAULTS.frontier), // previous block, 0000... by default
            transactionHash: hash, // From the pending transaction
            amountRaw: amount, // From the pending transaction in RAW
            work: (await this.generate_work((accountInfo.frontier||this.publicKey))), // Work is generated server-side but still generated separately.
        }
        return block.receive(data, this.key);
    }

    /**
     * This function obtains the representative address and is automatically ran with the validate method
     * @returns {string} representative address of the wallet
     */
    async get_representative() {
        let response = await this.invoke({action: "account_representative",account: this.address})
        return ((await response.json())?.representative)||DEFAULTS.representative;
    }

    /**
     * Creates and returns the signed send block
     * @param {object} accountInfo - Account info from account_info() function
     * @param {string} receiverAddress - The NANO wallet address
     * @param {number} amount - Amount in NANO, not RAW
     * @returns {SignedBlock}
     */
    async create_send_block(accountInfo, receiverAddress, amount) {
        const data = {
            walletBalanceRaw: accountInfo.balance, // Current balance from account info     
            fromAddress: this.address, // Your wallet address
            toAddress: receiverAddress, // The address to send to
            representativeAddress: (this.representative||DEFAULTS.representative), // From account info
            frontier: accountInfo.frontier, // Previous block, from account info
            amountRaw: tools.convert(amount, "NANO", "RAW"), // The amount to send in RAW
            work: (await this.generate_work(accountInfo.frontier)), // Work is generated server-side but still generated separately.
        }
        return block.send(data, this.key);
    }

    /**
     * Generates the work string
     * @param {string} frontier
     * @returns {string} work string
     */
    async generate_work(frontier) {
        let body = {
            "action": "work_generate",
            "difficulty": "fffffff800000000",
            "hash": frontier
        }
        let response = await this.invoke(body);
        return (await response.json())?.work;
    }

    /**
     * Send NANO from current Wallet to the provided wallet
     * @param {string} wallet
     * @param {number} amount
     */
    async send_nano(wallet, amount) {
        let info = await this.account_info();
        let block = await this.create_send_block(info, wallet, amount)

        let body = {
            "action": "process",
            "subtype": "send",
            "block": JSON.stringify(block)
        }

        let response = await this.invoke(body);
        let json = await response.json();
        return (json?.hash || false);
    }

    /**
     * Turns pending response into amount
     * @param {object} pending JS object from the pending function
     * @returns {number} Amount in NANO
     */
    receivable_amount_from_pending = (pending) => Object.values(pending.blocks).reduce((x,d)=>x+parseFloat(tools.convert(d.amount,"RAW","NANO")),0)
}

module.exports = Wallet;