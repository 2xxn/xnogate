// Import all the necessary classes/libraries!
import { Wallet } from "./wallet"
import { tools }  from "nanocurrency-web";

// This structure is very important.
interface config {
    seed: string;
    index: number;
    timeout: number;
    destination: string;
}

// Define the Payment class
class Payment {
    readonly destination: string;               // The destination wallet address
    readonly wallet: Wallet;                    // Wallet class
    readonly amount: number;                    // Requested amount
    readonly timeout: number;                   // Timeout
    readonly address: string;                   // Gateway NANO Address
    currentAmount: number;                      // Current receivable amount
    lastAddress: string;                        // Payment gateway supports payments coming from more than just one address, if user pays more than should be paid, it will be returned to the last address
    startTime: EpochTimeStamp;                  // Timestamp
    interval: ReturnType<typeof setInterval>    // Interval


    /**
     * As much as unnecessary it is to make a doc for this function, it is the most crucial part of the whole payment gateway so I believe it deserves one
     * @param onSuccess callback that will be called if the money went through and was already paid to the destination address
     * @param onTimeout callback that will be called if the payment timed out
     * @returns nothing, it's just a void called inside the setInterval function
     */
    async #intervalFunction(onSuccess: Function, onTimeout: Function): Promise<void> {
        // Get the pending amount and sum it up
        let pending = await this.wallet.pending();
        this.currentAmount = Wallet.receivable_from_pending(pending);

        // Set the last address to the last (technically first) block's source address,
        // if somehow not found just give that bonus to destination address ;)
        this.lastAddress = Object.values(pending.blocks)?.[0]?.source || this.destination;

        // Check if the payment already timed out
        if (Date.now() - this.startTime >= this.timeout * 1000) {

            if(this.currentAmount > 0) {
                // Receive money.
                await this.wallet.receive_all();

                // Return money.
                await this.returnChange(this.currentAmount);
            }
            

            // Clear the interval and call the timeout callback
            clearInterval(this.interval);
            onTimeout(this);

            // Stop the code right there
            return;
        }

        // Don't continue the code if the amount is still not enough
        if(this.amount >= this.currentAmount) return;

        // Receive all the blocks!
        await this.wallet.receive_all();

        // Send the required amount to destination address!
        await this.wallet.send_nano(this.destination,this.amount);

        // Clear the interval and call success callback
        clearInterval(this.interval);
        onSuccess(this);

        // And last of all, return the change. Everything up until that point worked
        // Now we can safely return what's left to the sender because we aren't scammers and mistakes do happen!
        await this.returnChange(this.currentAmount-this.amount)
    }

    /**
     * Start the Payment gateway
     * @param onSuccess callback that will be called if the money went through and was already paid to the destination address
     * @param onTimeout callback that will be called if the payment timed out
     */
    start(onSuccess: Function, onTimeout: Function): void {
        // Set the start time to now!
        this.startTime = Date.now() as EpochTimeStamp;

        // Start the interval to be checking for payment every 7 seconds (to not flood the rpc server)
        this.interval = setInterval(this.#intervalFunction.bind(this, onSuccess, onTimeout), 7000);
    }

    /**
     * Return the overpaid amount to last address that sent NANO to the gateway
     * @param change the overpaid amount, can be 0 but if it is, nothing will happen
     * @returns true if it succeeded, false if it did not
     */
    async returnChange(change: number): Promise<boolean | object> {
        // Make sure it's not smaller or equal to 0 otherwise don't send anything (read as: exact amount delivered)
        if(change<=0) return false;

        // Try to send NANO back
        const response = await this.wallet.send_nano(this.lastAddress,"all");

        // Return either true or false, we don't need any extra info if any at all
        return response !== false;
    }

    /**
     * Create a new Payment gateway, start it by calling start(onSuccess, onTimeout) method
     * @param amount amount in NANO that is required
     * @param timeout timeout in seconds, after what time (rounded always up to 7 seconds) should gateway stop waiting for the payment?
     * @param wallet wallet to be used as payment gateway, never use one that already has NANO (or pending NANO)!
     * @param destination the address that all the NANO will eventually end up in
     * @throws if destination address is invalid
     */
    constructor(amount: number, timeout: number, wallet: Wallet, destination: string) {
        // Make sure the dest address is actually a NANO address
        if(!tools.validateAddress(destination)) throw Error("Destination must be a valid NANO address");
        
        // Set all the variables!
        this.destination = destination;
        this.wallet  = wallet;
        this.amount  = amount;
        this.timeout = timeout;
        this.address = wallet.address; // For easier access.
        this.currentAmount = 0;        // Assume gateway address has 0 XNO (as it should)
        this.lastAddress = "";         // Make sure string is empty
    }


}


// Define the Payments class
class Payments {


    /**
     * it's an alias of payment.start(onSuccess, onTimeout) which you should probably use instead of this
     * @param payment payment to start
     * @param onSuccess success callback 
     * @param onTimeout timeout callback
     */
    static start = (payment: Payment, onSuccess: Function, onTimeout: Function): void => payment.start(onSuccess, onTimeout);

    /**
     * Create a new Payment using config and the amount
     * @param config config including seed, index, timeout (in seconds) and destination address
     * @param amount amount in NANO, not RAW
     * @returns instance of the payment class!
     */
    static create(config: config, amount: number): Payment {
        // error checking is done in the main file (i think)
        // create new wallet from the provided seed and index
        // (or if it's not provided, generate a new one and use index 0!)
        let wallet: Wallet = Wallet.new(config.seed || Wallet.generateSeed(), config.index || 0);

        // Create the new Payment!
        let payment: Payment = new Payment(amount, config.timeout, wallet, config.destination);

        // Now, return it!
        return payment;
    }

}

export { Payments, Payment, config };