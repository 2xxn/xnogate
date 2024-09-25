export interface AccountRepresentative {
    representative: string;
}

export interface GenerateWork {
    work: string;
}

export interface Account {
    balance: string;
    frontier: string;
}

export interface Process {
    hash: string;
}

export interface PendingBlock {
    source: string;
    amount: string;
}

export interface PendingBlocks {
    blocks: Array<PendingBlock>;
}