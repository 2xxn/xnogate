import { Options as ReconnectingWebSocketOptions } from "reconnecting-websocket";
import { Payment } from "../modules/gateway";

export type CallbackFunction = (p: Payment) => Promise<void>;

export interface Options extends WebSocketOptions {
    representative?: string;
    frontier?: string;
    rpc?: string;
    defaultHeaders?: { [key: string]: string; };
}

export interface Config {
    seed: string;
    index: number;
    timeout: number;
    destination: string;
}

export interface WebSocketOptions {
    ws?: string; // WebSocket url
    rwsOptions?: Partial<ReconnectingWebSocketOptions>
}