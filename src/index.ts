import { Wallet } from "./modules/wallet";
import { Payments, Payment, config } from "./modules/gateway"

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
    create: (config: config, amount: number): Payment => {
        // If seed is not supplied, it will be generated randomly with the provided index (or 0 if that wasn't provided either)
        if(isNaN(amount) || amount<=0) throw Error("Amount must be of number type, not NaN and higher than 0!");

        // Create the payment
        return Payments.create(config, amount);
    },

    /**
     * An alias for Payment.start(onSuccess,onTimeout).
     * Starts the payment interval.
     * @param payment Payment to start
     * @param onSuccess Callback when the payment goes through
     * @param onTimeout Callback when the payment times out
     */
    start: (payment: Payment, onSuccess: Function, onTimeout: Function): void => payment.start(onSuccess, onTimeout),
}

export { payments, Wallet as wallet }