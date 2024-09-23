import { Payment } from "../modules/gateway";

export type CallbackFunction = (p: Payment) => Promise<void>;

export interface Options {
    representative?: string;
    frontier?: string;
    rpc?: string;
    ws?: string; // TODO: Support
    defaultHeaders?: { [key: string]: string; };
}

export interface Config {
    seed: string;
    index: number;
    timeout: number;
    destination: string;
}