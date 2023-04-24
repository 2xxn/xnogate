const Wallet = require("./modules/wallet.js");
const {Payments,Interval} = require("./modules/gateway.js");

const payments = {
    /**
     * Creates a new Payment gateway with requested amount.
     * Gateway does not start automatically, you must call start(onSuccess,onTimeout) on the returned value.
     * index in config is not automatically incremeneted, configuration should happen on your end.
     * @param {object} config Object containing seed, index, destination address, timeout (in seconds)
     * @param {number} amount Requested amount in NANO (not RAW)
     * @throws {Error} if config is invalid
     * @returns {Interval}
     */
    create: (config,amount) => {
        // seed is generated randomly by default and index is 0 by default.
        // if(!seed in config    || typeof config.seed    != "string") throw Error("Missing or invalid seed in config object");
        if(!"timeout" in config || typeof config.timeout != "number") throw Error("Missing or invalid timeout (seconds) in config object");
        if(!"destination" in config || typeof config.destination !="string") throw Error("Missing or invalid destination address in config object");
        if(typeof amount != "number" || isNaN(amount)) throw Error("Amount must be of number type and not NaN");
        // if(!index in config) throw Error("Missing wallet index in config object")
        return Payments.create(config,amount);
    },

    /**
     * An alias of Interval.start(onSuccess,onTimeout).
     * Starts the payment interval.
     * @param {Interval} interval Payment to start
     * @param {Function} onSuccess Callback when the payment goes through
     * @param {Function} onTimeout Callback when the payment times out
     * @returns {undefined} This function is a void
     */
    start: (interval,onSuccess,onTimeout) => {
        if(!(interval instanceof Interval)) throw Error("Argument passed is not an instance of Interval");
        if(typeof onSuccess != "function" || typeof onTimeout != "function")  throw Error("Both parameters, onSuccess and onTimeout must be functions");
        interval.start(onSuccess,onTimeout);
    }

}

module.exports = { payments, wallet:Wallet }