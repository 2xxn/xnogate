import { Wallet } from "./modules/wallet";
import { Payments, Payment, Config } from "./modules/gateway"
import { CallbackFunction, Options } from "./types/library";

const payments = {
    /**
     * Creates a new Payment gateway with requested amount.
     * Gateway does not start automatically, you must call start(onSuccess,onTimeout) on the returned value.
     * index in config is not automatically incremeneted, configuration should happen on your end.
     * @param config Object containing seed, index, destination address, timeout (in seconds)
     * @param amount Requested amount in NANO (not RAW)
     * @throws if config or amount is invalid
     * @returns
     */
    create: (config: Config, amount: number, walletOptions?: Options): Payment => {
        // If seed is not supplied, it will be generated randomly with the provided index (or 0 if that wasn't provided either)
        // Much advised to use a custom seed.
        if(isNaN(amount) || amount<=0) throw Error("Amount must be of number type, not NaN and higher than 0!");

        return Payments.create(config, amount, walletOptions);
    },

    /**
     * An alias for Payment.start(onSuccess,onTimeout).
     * Starts the payment interval.
     * @param payment Payment to start
     * @param onSuccess Callback when the payment goes through
     * @param onTimeout Callback when the payment times out
     */
    start: (payment: Payment, onSuccess: CallbackFunction, onTimeout: CallbackFunction): void => payment.start(onSuccess, onTimeout),
}

export { payments, Wallet as wallet, Wallet, payments as Payments } // No idea why I made it lowercase in the past but I'm keeping both ways