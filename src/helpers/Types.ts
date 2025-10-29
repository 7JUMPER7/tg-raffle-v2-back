import { EGiftQuality, ELotteryStatus } from "./Enums";

export type TUser = {
    tgId: string;
    displayName: string; // firstName or username or id
    image?: string | null;
};

export type TWithdrawUser = {
    userId: string;
    address: string;
    amount: number;
};

export type TGift = {
    slug: string;
    image?: string;
    price: number;
};

export type TCaseItem = {
    slug: string;
    image: string;
    backdropColor: string;
    quality: EGiftQuality;
};

export type TLotteryParticipation = {
    id: string;
    user: TUser;
    gift: TGift;
    createdAt: Date;
};

export type TLotteryParsed = {
    id: string;
    status: ELotteryStatus;
    expiresAt: Date | null;
    participations: TLotteryParticipation[];
    winner?: TUser;
    winParticipation?: TLotteryParticipation;
};

export type TLuckyOne = {
    user?: TUser;
    gifts: TGift[];
    totalTon: number;
    totalParticipations: number;
};

export type TFullUserInfo = {
    id: string;
    telegramId: string;
    telegramUsername: string | null;
    telegramName: string | null;
    telegramImage: string | null;
    referralCode: string;
    gifts: (TGift & { id: string; isUsed: boolean })[];
    tonBalance: number;
    starsBalance: number;
    pointsBalance: number;
    enteredLottery: {
        lotteryId: string;
        gifts: TGift[];
    } | null;
    wonLottery: {
        lotteryId: string;
        tonValue: number;
    } | null;
    channelLink: string;
    subscribedChannel: boolean;
    chatLink: string;
    subscribedChat: boolean;
};

export type TChatMessage = {
    id: string;
    userTgId: string;
    userTgUsername: string | null;
    userTgImage: string | null;
    text: string;
    createdAt: Date;
};
