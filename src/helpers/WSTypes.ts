import { EWebSocketMessage } from "./Enums";
import { TGift, TUser } from "./Types";

export type TWebSocketMessage<T> = {
    type: EWebSocketMessage;
    data: T;
};

export type TWebSocketParticipation = {
    lotteryId: string;
    expiresAt: Date | null;
    isAnon: boolean;
    user?: TUser;
    gifts: TGift[];
    createdAt: Date;
};
