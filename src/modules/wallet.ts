// Import all the necessary libraries!
import { block, tools, wallet } from "nanocurrency-web";
import { Account as AccountI } from "nanocurrency-web/dist/lib/address-importer";
import { ReceiveBlock, SignedBlock } from "nanocurrency-web/dist/lib/block-signer";
import fetch, { Response } from 'node-fetch';
import { Account, AccountRepresentative, GenerateWork, PendingBlocks, Process } from "../types/node";
import { Options } from "../types/library";

/*
* Default settings to use either if a value is not set or just use
* Feel free to edit
*/
const DEFAULTS: Options = {
    representative: "nano_1b9wguhh39at8qtm93oghd6r4f4ubk7zmqc9oi5ape6yyz4s1gamuwn3jjit", // Default representative, used if the address doesn't have one (which in case of payment gateway, should NOT)
    frontier: "0000000000000000000000000000000000000000000000000000000000000000",        // Default frontier if fetching the last one goes wrong (which always happens if an account didn't send or receive any transactions)
    rpc: "https://nano.a.exodus.io/",                                                    // The RPC server used by the Wallet, Why Exodus? No limit on requests
};

class Wallet {

    // #region static functions!

    /**
     * Turns pending response into amount
     * @param pending JS object from the pending function
     * @returns Amount in NANO
     */
    static receivableFromPending = (pending: PendingBlocks): number => Object.values((pending.blocks||[])).reduce((x,d)=>x+parseFloat(tools.convert(d.amount, "RAW", "NANO")),0);

    /**
     * Generates a random seed
     * @returns random seed that can be used as wallet seed (OR a private key)
     */
    static generateSeed = () => Array.from(Array(8).keys()).map(_=>(Math.floor(Math.random()*9999999999-1000000000)*100000000).toString(16).substring(0,12).replace(/-/gm,"")).join("").substring(4,68);

    // #endregion

    readonly address: string;       // NANO address
    readonly key: string;           // private key (named just key because it's kind of important)
    readonly publicKey: string;     // public key
    readonly options: Options;
    server: string;                 // RPC server to be used by the class
    representative: string;         // Representative address of the wallet


    /**
     * Sends request to the RPC server
     * @param  body JS object (not JSON) of the body
     */
    async invoke(body: any): Promise<Response> {
        const response: Response = await fetch(this.server, {
            method: "POST",
            headers: {
                ...(this.options?.defaultHeaders ?? {}),
                'Accept': "application/json, text/plain, */*",'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        return response;
    }


    /**
     * Creates a new instance of the Wallet class using seed and index of the Wallet
     * @param seed 64 characters long seed of the Wallet
     * @param index Index of the Address <0, 4294967295>
     * @throws if any of the given parameters were bad
     * @returns freshly created Wallet class
     */
    static new(seed: string, index: number, options: Options = {}): Wallet {
        // Make sure params are valid
        if ((index > 4294967295 || index < 0)) throw Error("Invalid index")
        if(!seed.match(/^[0-9A-Fa-f]{64,64}$/g)) throw Error("Invalid seed");

        // Get the account info!
        const account: AccountI = wallet.legacyAccounts(seed, index, index)?.[0];

        // Create the Wallet and return it
        return new Wallet(account.privateKey, account.address, options);
    }

    /**
     * Creates a new instance of the Wallet class using private key and Wallet address.
     * @param key Private key of your wallet
     * @param address The address of the wallet
     * @throws If the wallet is invalid or the key is not a 64-character string.
     * @returns instance of the Wallet class
     */
    constructor(key: string, address: string, options: Options = {}) {
        this.options = { ...DEFAULTS, ...options }
        // Make sure both variables are valid
        if(!key.match(/^[0-9A-Fa-f]{64,64}$/g)) throw Error("Invalid private key");
        if (!tools.validateAddress(address)) throw Error("Invalid NANO address");

        // Set all the readonly variables and server!
        this.server = this.options.rpc; // this can be changed after initializing
        this.key = key;
        this.address = address;
        this.publicKey = tools.addressToPublicKey(address);
    }

    /**
     * This function has to be run at least once.
     * It validates by getting the representative of the address provided
     * It doesn't matter on new accounts
     * @returns Wallet 
     */
    async validate(): Promise<Wallet> {
        // Get the representative and return wallet so it can be used like 'await (Wallet.new(blah,blah)).validate()' (optimalized for spaghetti code)
        this.representative = await this.getRepresentative();

        return this;
    }

    /**
     * This function obtains the account_info of the Wallet
     * @returns {object} account_info
     */
    async accountInfo(): Promise<Account> {
        const response: Response = await this.invoke({action: "account_info", account: this.address});
        return (await response.json()) as Account;
    }

    /**
     * 
     * @param {string} frontier 64 character long hash number
     * @returns {object} JS object containing blocks
     */
    async blocksInfo(frontier: string): Promise<object> {
        if (frontier?.length != 64) throw new Error("Bad hash number");
        let body = {
            action: "blocks_info",
            hashes: [frontier]
        };
        let response = await this.invoke(body);
        return (await response.json()) as object;
    }

    /**
     * This function is self explanatory
     * @returns All the pending blocks
     */
    async pending(): Promise<PendingBlocks> {
        let body = {
            "account": this.address,
            "count": 50,
            "threshold": "1000000000000000000000000", // TODO: maybe lower this? I don't remember what this was for
            "source": true,
            "include_only_confirmed": true,
            "action": "pending"
        }
        let response = await this.invoke(body);
        const json = await response.json();
        return json as PendingBlocks;
    }


    async receiveAll(pending=null) {
        if(pending==null) pending = (await this.pending());
        pending = pending?.blocks;
        const successArray = [];

        if ((pending || []).length == 0) return [];

        for (const i in pending) {
            const info = await this.accountInfo();
            const block = await this.createReceiveBlock(info, i, pending[i].amount);
            const body = {
                "action": "process",
                "subtype": "receive",
                "block": JSON.stringify(block)
            }

            const response = await this.invoke(body);
            const json = await response.json() as Process;
            successArray.push(((json?.hash || "") != ""));
        }
        return successArray;
    }

    /**
     * Creates and signs a receive transaction block
     * @param accountInfo account info of the current Wallet
     * @param hash Last transaction hash
     * @param amount amount IN RAW of the pending transaction
     * @returns the signed block
     */
    async createReceiveBlock(accountInfo: Account, hash: string, amount: string): Promise<SignedBlock> {
        const data: ReceiveBlock = {
            walletBalanceRaw: (accountInfo.balance || "0"),                               // Current balance in RAW from account info
            toAddress: this.address,                                                    // Your address
            representativeAddress: (this.representative || this.options.representative),      // Address of the representative
            frontier: (accountInfo.frontier || this.options.frontier),                        // previous block, 0000... by default
            transactionHash: hash,                                                      // From the pending transaction
            amountRaw: amount,                                                          // From the pending transaction in RAW
            work: (await this.generateWork((accountInfo.frontier||this.publicKey))),   // Work is generated server-side but still generated separately.
        }
        
        return block.receive(data, this.key);
    }

    /**
     * This function obtains the representative address and is automatically ran with the validate method
     * @returns {string} representative address of the wallet
     */
    async getRepresentative(): Promise<string> {
        const response: Response = await this.invoke({ action: "account_representative", account: this.address });
        const json: AccountRepresentative = await response.json() as AccountRepresentative;
        return (json?.representative)||this.options.representative;
    }

    /**
     * Creates and returns the signed send block
     * @param accountInfo - Account info from account_info() function
     * @param receiverAddress - The NANO wallet address
     * @param amount - Amount in NANO, not RAW
     * @returns signed block
     */
    async createSendBlock(accountInfo: Account, receiverAddress: string, amount: number): Promise<SignedBlock> {
        const data = {
            walletBalanceRaw: accountInfo.balance,                                  // Current balance from account info     
            fromAddress: this.address,                                              // Your wallet address
            toAddress: receiverAddress,                                             // The address to send to
            representativeAddress: (this.representative||this.options.representative),  // From account info
            frontier: accountInfo.frontier,                                         // Previous block, from account info
            amountRaw: tools.convert(amount.toString(), "NANO", "RAW"),                        // The amount to send in RAW
            work: (await this.generateWork(accountInfo.frontier)),                 // Work is generated server-side but still generated separately.
        }
        return block.send(data, this.key);
    }

    /**
     * Generates the work string
     * @param {string} frontier
     * @returns {string} work string
     */
    async generateWork(frontier: string): Promise<string> {
        const body = {
            "action": "work_generate",
            "difficulty": "fffffff800000000",
            "hash": frontier
        }
        const response = await this.invoke(body);
        const json = await response.json() as GenerateWork;
        return json?.work;
    }

    /**
     * Send NANO from current Wallet to the provided wallet
     * @param {string} wallet
     * @param {number} amount can be "all"
     */
    async send(wallet: string, amount: (number | "all"), retries=0) {
        // Obtain all the neccessities (prepare the send_block!)
        const info = await this.accountInfo();
        if(amount=="all") amount = parseFloat(tools.convert(info.balance, "RAW", "NANO"));
        const block = await this.createSendBlock(info, wallet, amount)
        const body = {
            "action": "process",
            "subtype": "send",
            "block": JSON.stringify(block)
        }

        // Invoke the action
        const response = await this.invoke(body);
        const json = await response.json() as Process;

        // Try 3 times total, return false if fails either way
        const ret = json?.hash || false;
        if(ret || retries>2) return ret;
        return (await this.send(wallet, amount, retries+1));
    }

}

export { Wallet };