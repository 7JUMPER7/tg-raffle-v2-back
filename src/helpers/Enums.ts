export enum ELotteryStatus {
    PENDING = "PENDING",
    CANCELED = "CANCELED",
    UNCLAIMED = "UNCLAIMED",
    FINISHED = "FINISHED",
}

export enum EWebSocketMessage {
    LOTTERY_INFO = "lottery-info",
    PARTICIPATION = "participation",
    LOTTERY_CLOSE = "lottery-close",
    CHAT_MESSAGE = "chat-message",
}

export enum ETgSubscription {
    CHAT = "chat",
    CHANNEL = "channel",
}

export enum ELanguageCode {
    EN = "en",
    RU = "ru",
}

export enum EBackdropColor {
    BLACK = "Black",
    ONYX_BLACK = "Onyx Black",
}