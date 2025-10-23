export enum ELotteryStatus {
    PENDING = "PENDING",
    CANCELED = "CANCELED",
    UNCLAIMED = "UNCLAIMED",
    FINISHED = "FINISHED",
}

export enum ECoinflipStatus {
    PENDING = "PENDING",
    CANCELED = "CANCELED",
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

export enum EActivityType {
    CHANNEL_SUBSCRIPTION = "CHANNEL_SUBSCRIPTION",
    CHAT_SUBSCRIPTION = "CHAT_SUBSCRIPTION",
    REFERRAL_INCOME = "REFERRAL_INCOME",
}

export enum EGiftQuality {
    GODLIKE = "GODLIKE",
    ULTRA = "ULTRA",
    RARE = "RARE",
    UNCOMMON = "UNCOMMON",
    COMMON = "COMMON",
    AVERAGE = "AVERAGE",
    POOR = "POOR",
}

export enum ECurrency {
    TON = "TON",
    STARS = "STARS",
}
