const Wallet = require("./wallet");
const { tools } = require('nanocurrency-web');

const Interval = {
    destination: "unknown", // The destination wallet address
    wallet: null,         // Wallet class
    lastAddress: null,    // Payment gateway supports payments coming from more than just one address, if user pays more than should be paid, it will be returned to the last address
    currentAmount: 0,   // Current receivable amount
    amount: 0,          // Requested amount
    startTime: 0,       // Timestamp
    timeout:0,          // Timeout
    interval: null,     // Interval


    intervalFunction: async function (onSuccess,onTimeout) {
        if (Date.now() - this.startTime >= this.timeout * 1000) {
            clearInterval(this.interval);
            onTimeout(this);
            return;
        }
        let pending = await this.wallet.pending();
        this.currentAmount = this.wallet.receivable_amount_from_pending(pending);
        if(this.amount >= this.currentAmount) return;
        this.lastAddress = Object.values(pending.blocks)?.[0]?.source||this.destination;
        await this.wallet.receive_all(pending);

        await this.wallet.send_nano(this.destination,this.amount);

        clearInterval(this.interval);
        onSuccess(this);
        this.returnChange(this.currentAmount-this.amount)
        return;
    },

    /**
     * Starts an Interval
     * @param {function} onSuccess Callback function that happens if correct amount was given
     * @param {function} onTimeout Callback function that happens if user leaves the website OR times out
     * There isn't a "onFail" function because I see no real possibility this could've failed 
     */
    start: function(onSuccess, onTimeout) {
        this.startTime = Date.now();
        this.interval = setInterval(this.intervalFunction.bind(this,onSuccess,onTimeout), 7000);
    },

    /**
     * 
     * @param {number} change Amount to send back
     * @returns {boolean}
     */
    returnChange: async function(change) {
        if(change<=0) return false;
        return (await this.wallet.send_nano(this.lastAddress,change));
    },

    /**
     * 
     * @param {number} amount Requested amount in NANO, not RAW
     * @param {number} timeout Timeout in seconds
     * @param {Wallet} wallet Wallet of the gateway address
     */
    new: function(amount,timeout,wallet,destination) {
        this.destination = destination;
        this.wallet = wallet;
        this.amount = amount;
        this.timeout=timeout;
        this.address = wallet.address;
        this.currentAmount = 0;
        this.lastAddress = "";
        return this;
    }
}

function newInterval(amount, timeout, wallet, destination)
{
    if(typeof amount != "number") throw Error("Amount must be a number and not "+(typeof amount));
    if(typeof timeout != "number") throw Error("Timeout must be a number and not "+(typeof amount));
    if(!tools.validateAddress(destination)) throw Error("Destination must be a valid NANO address");
    if(!wallet instanceof Wallet) throw Error("Invalid Wallet provided")

    let int = Object.create(Interval);
    int.new(amount,timeout,wallet,destination)
    return int;
}

class Payments {


    static start(interval,onSuccess,onTimeout) {
        interval.start(onSuccess,onTimeout);
    }

    static create(config,amount) {
        // error checking is done in the index.js
        let wallet =  Wallet.new((config.seed||Wallet.generateSeed()),(config.index||0))
        let interval = newInterval(amount,config.timeout,wallet,config.destination);

        return interval;
    }

}

module.exports = {Payments,Interval};