import WebSocket from "ws";
import { JwtUserPayload } from "./Interfaces";
import { TGift, TUser } from "./Types";

export interface IAuthenticatedWebSocket extends WebSocket {
    userPayload?: JwtUserPayload;
    userId: string;
    isAlive: boolean;
    connectedAt: number;
}

export enum EWebSocketMessage {
    // System events
    ERROR = "error",

    // Lottery events
    LOTTERY_INFO = "lottery-info",
    NEW_LOTTERY = "new-lottery",
    PARTICIPATION = "participation",
    LOTTERY_CLOSE = "lottery-close",

    // User events
    BALANCE_UPDATE = "balance-update",
    GIFTS_UPDATE = "gifts-update",
}

// Global websocket message type
export type TWebSocketMessage<T> = {
    type: EWebSocketMessage;
    data: T;
};

// System events
export type TConnectionSuccess = {
    userId: string;
    message: string;
};

export type TErrorMessage = {
    message: string;
    code?: string;
};

// Lottery events
export type TWebSocketParticipation = {
    lotteryId: string;
    expiresAt: Date | null;
    user?: TUser;
    gifts: TGift[];
    createdAt: Date;
};

// User events
export type TBalancesUpdate = {
    ton: number;
    stars: number;
    points: number;
};
