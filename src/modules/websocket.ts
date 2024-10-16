import WS from 'ws';
import ReconnectingWebSocket, { Message } from 'reconnecting-websocket';
import EventEmitter from 'events';
import { WebSocketOptions } from '../types/library';
import { tools } from 'nanocurrency-web';

export class NanoWebSocketManager extends EventEmitter {
    private ws: ReconnectingWebSocket = null;
    private addressList: Set<string> = new Set();

    constructor(options: WebSocketOptions) {
        super();

        if(!options.ws) throw Error("WebSocket URL not supplied");

        // Address list to subscribe for transactions
        this.addressList = new Set();
        
        // Initialize ReconnectingWebSocket
        this.ws = new ReconnectingWebSocket(options.ws, [], {
            WebSocket: WS,
            connectionTimeout: 1000,
            maxRetries: 100000,
            maxReconnectionDelay: 2000,
            minReconnectionDelay: 10,
            ...(options.rwsOptions ?? {})
        });

        // WebSocket event handlers
        this.ws.onopen = this._handleOpen.bind(this);
        this.ws.onmessage = this._handleMessage.bind(this);
        this.ws.onclose = this._handleClose.bind(this);
    }

    /**
     * Create a WebSocket subscribe packet
     * @param accountsToAdd List of accounts to add to tracking
     * @returns JSON
     */
    private _subscribePacket(accountsToAdd?: string[]): Message {
        return JSON.stringify({
            "action":"subscribe",
            "topic":"confirmation",
            "options": {
                "confirmation_type":"active_quorum",
                "accounts": accountsToAdd ?? []
            }
        });
    }

        /**
     * Create a WebSocket unsubscribe packet
     * @param accountsToRemove List of accounts to remove from tracking
     * @returns JSON
     */
    private _unsubscribePacket(accountsToRemove?: string[]): Message {
        return JSON.stringify({
            "action":"unsubscribe",
            "topic":"confirmation",
            "options": {
                "accounts": accountsToRemove ?? []
            }
        });
    }

    // Handle WebSocket connection open
    private _handleOpen() {
        console.log('WebSocket connected!');
        this.emit("open");
        this._subscribeToAddresses();
    }

    // Handle WebSocket messages
    private _handleMessage(msg: { data: string; }) {
        const data = JSON.parse(msg.data);

        if (data.topic === 'confirmation') {
            const confirmedHash = data.message.hash;
            const account = data.message.account;
            
            const link = data.message.block?.link
            const receiver = tools.publicKeyToAddress(link);

            // Emit event only if the confirmation is for an address in the list
            if (this.addressList.has(receiver)) {
                this.emit('confirmed', { account, hash: confirmedHash, receiver });
            }
        }
    }

    private _handleClose() {
        console.log('WebSocket connection closed. Attempting to reconnect...');
    }

    // Send the subscription request with the updated address list
    private _subscribeToAddresses() {
        if (this.ws.readyState === WS.OPEN && this.addressList.size > 0) {
            console.log('Subscribing to addresses:', this.addressList);

            this.ws.send(this._subscribePacket(Array.from<string>(this.addressList)));
        } else if (this.addressList.size === 0) {
            console.log('No addresses to subscribe to.');
        }
    }

    // Send the unsubscribe request for specific addresses
    private _unsubscribeFromAddresses(addresses: string[]) {
        if (this.ws.readyState === WS.OPEN && addresses.length > 0) {
            console.log('Unsubscribing from addresses:', addresses);

            this.ws.send(this._unsubscribePacket(addresses));
        }
    }

    // Public method to add an address and resubscribe
    subscribeAddress(address: string) {
        if (this.addressList.has(address)) return;

        this.addressList.add(address);
        this.ws.send(this._subscribePacket([address]));
    }

    // Public method to remove an address and unsubscribe
    unsubscribeAddress(address: string) {
        if (!this.addressList.has(address)) return;

        this.addressList.delete(address);
        this._unsubscribeFromAddresses([address]);
    }

    // Public method to get the current list of subscribed addresses
    getSubscribedAddresses() {
        return Array.from(this.addressList);
    }
}