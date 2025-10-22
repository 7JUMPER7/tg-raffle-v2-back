import { ELanguageCode, ETgSubscription } from "../helpers/Enums";
import TelegramBot, { InlineKeyboardButton, Message } from "node-telegram-bot-api";
import { checkReferralCode, timeout } from "../helpers/Helpers";
import GiftDBController from "../DBControllers/GiftDBController";
import TelegramService from "./TelegramService";
import User from "../models/User.model";
import UserDBController from "../DBControllers/UserDBController";

if (!process.env.TELEGRAM_BOT_API_KEY) {
    console.error("TELEGRAM_BOT_API_KEY not set");
    process.exit(1);
}
if (!process.env.WEB_APP_URL) {
    console.error("WEB_APP_URL not set");
    process.exit(1);
}
if (!process.env.TG_BOT_USERNAME) {
    console.error("TG_BOT_USERNAME not set");
    process.exit(1);
}
if (!process.env.TG_RECIEVER_USERNAME) {
    console.error("TG_RECIEVER_USERNAME not set");
    process.exit(1);
}
if (!process.env.TG_SUPPORT_USERNAME) {
    console.error("TG_SUPPORT_USERNAME not set");
    process.exit(1);
}
if (!process.env.BOT_ADMINS) {
    console.error("BOT_ADMINS not set");
    process.exit(1);
}

if (!process.env.TG_EN_CHANNEL_LINK) {
    console.error("TG_EN_CHANNEL_LINK not set");
    process.exit(1);
}
if (!process.env.TG_EN_CHANNEL_ID) {
    console.error("TG_EN_CHANNEL_ID not set");
    process.exit(1);
}

if (!process.env.TG_EN_GROUP_LINK) {
    console.error("TG_EN_GROUP_LINK not set");
    process.exit(1);
}
if (!process.env.TG_EN_GROUP_ID) {
    console.error("TG_EN_GROUP_ID not set");
    process.exit(1);
}

if (!process.env.TG_RU_CHANNEL_LINK) {
    console.error("TG_RU_CHANNEL_LINK not set");
    process.exit(1);
}
if (!process.env.TG_RU_CHANNEL_ID) {
    console.error("TG_RU_CHANNEL_ID not set");
    process.exit(1);
}

if (!process.env.TG_RU_GROUP_LINK) {
    console.error("TG_RU_GROUP_LINK not set");
    process.exit(1);
}
if (!process.env.TG_RU_GROUP_ID) {
    console.error("TG_RU_GROUP_ID not set");
    process.exit(1);
}

class TelegramBotService {
    private WEB_APP_URL: string = process.env.WEB_APP_URL!;
    private TG_BOT_LINK: string = "https://t.me/" + process.env.TG_BOT_USERNAME! + "?profile";
    private TG_RECIEVER_LINK: string = "https://t.me/" + process.env.TG_RECIEVER_USERNAME!;
    private TG_SUPPORT_LINK: string = "https://t.me/" + process.env.TG_SUPPORT_USERNAME!;
    private GROUPS: { [key in ELanguageCode]: { link: string; id: string } } = {
        [ELanguageCode.EN]: {
            link: process.env.TG_EN_GROUP_LINK!,
            id: process.env.TG_EN_GROUP_ID!,
        },
        [ELanguageCode.RU]: {
            link: process.env.TG_RU_GROUP_LINK!,
            id: process.env.TG_RU_GROUP_ID!,
        },
    };
    private CHANNELS: { [key in ELanguageCode]: { link: string; id: string } } = {
        [ELanguageCode.EN]: {
            link: process.env.TG_EN_CHANNEL_LINK!,
            id: process.env.TG_EN_CHANNEL_ID!,
        },
        [ELanguageCode.RU]: {
            link: process.env.TG_RU_CHANNEL_LINK!,
            id: process.env.TG_RU_CHANNEL_ID!,
        },
    };

    private bot: TelegramBot;
    private botAdmins: number[];

    constructor() {
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_API_KEY ?? "", { polling: true });
        this.botAdmins = process.env.BOT_ADMINS ? JSON.parse(process.env.BOT_ADMINS) : [];
    }

    start = async () => {
        // ------------- Set all commands -------------
        // Start command
        this.bot.onText(/\/start/, async (msg) => {
            if (msg.text) {
                let refCode = null;
                const words = msg.text.split(" ");
                if (words.length > 1 && checkReferralCode(words[1])) {
                    refCode = words[1];
                }
                await this.startHandler(msg, refCode);
            }
        });

        // Fee gifts command (admin)
        this.bot.onText(/\/fee_gifts/, async (msg) => {
            if (msg.text) {
                await this.getFeeGiftsHandler(msg);
            }
        });

        // Withdraw fee gift command (admin)
        this.bot.onText(/\/withdraw/, async (msg) => {
            if (msg.text) {
                const words = msg.text.split(" ");
                if (words.length < 2) {
                    await this.bot.sendMessage(msg.chat.id, "Please provide a gift id.");
                    return;
                }
                const giftId = words[1];
                const toUsername = words[2] || msg.from?.username;
                if (!toUsername) {
                    await this.bot.sendMessage(msg.chat.id, "Please provide a username to withdraw the gift to.");
                    return;
                }
                await this.withdrawFeeGiftHandler(msg, giftId, toUsername);
            }
        });

        // Set gift as withdrawn (admin)
        this.bot.onText(/\/set_withdrawn/, async (msg) => {
            if (msg.text) {
                const words = msg.text.split(" ");
                if (words.length < 2) {
                    await this.bot.sendMessage(msg.chat.id, "Please provide a gift id.");
                    return;
                }
                const giftId = words[1];
                await this.setGiftAsWithdrawnHandler(msg, giftId);
            }
        });

        // Get gift by slug (admin)
        this.bot.onText(/\/gift/, async (msg) => {
            if (msg.text) {
                const words = msg.text.split(" ");
                if (words.length < 2) {
                    await this.bot.sendMessage(msg.chat.id, "Please provide a gift slug.");
                    return;
                }
                const giftSlug = words[1];
                await this.getGiftBySlugHandler(msg, giftSlug);
            }
        });

        // Get top users (admin)
        this.bot.onText(/\/top_users/, async (msg) => {
            if (msg.text) {
                const words = msg.text.split(" ");
                if (words.length < 2) {
                    await this.bot.sendMessage(msg.chat.id, "Please provide timeframe (in days).");
                    return;
                }
                const daysAmount = parseInt(words[1], 10);
                if (isNaN(daysAmount) || daysAmount <= 0) {
                    await this.bot.sendMessage(msg.chat.id, "Please provide a valid number of days.");
                    return;
                }
                await this.getTopUsersHandler(msg, daysAmount);
            }
        });

        // Start the bot
        if (this.bot.isPolling()) {
            console.log("Stopping existing Telegram bot polling...");
            await this.bot.stopPolling();
        }
        console.log("Starting Telegram bot...");
        this.bot.startPolling();
    };

    // ---------------------------- Handlers ----------------------------
    private startHandler = async (msg: Message, refCode: string | null) => {
        try {
            // Check language code
            const language =
                msg.from?.language_code && Object.values(ELanguageCode).includes(msg.from.language_code as any)
                    ? (msg.from.language_code as ELanguageCode)
                    : ELanguageCode.EN;

            // WebApp url
            let url = this.WEB_APP_URL;
            if (refCode) {
                url += "?refCode=" + refCode;
            }

            // Message
            let message;
            let keyboard: InlineKeyboardButton[][];
            if (language === ELanguageCode.RU) {
                message = `<i>Добро пожаловать в ресторан <a href="${this.TG_BOT_LINK}">Balzi Rossi</a>, премиальное ночное заведение среди азартных людей. На улицу в этот час выходить слишком опасно, заходи и забери все чтоб с рассветом начать новую жизнь.</i>`;
                keyboard = [
                    [{ text: "🏆 Играть!", web_app: { url: url } }],
                    [{ text: "🥃 Канал", url: this.CHANNELS[language].link }],
                    [{ text: "💎 Подарки в чате", url: this.CHANNELS[language].link }],
                    [{ text: "🍹 Пополнить баланс", url: this.TG_RECIEVER_LINK }],
                    [{ text: "👨🏻‍⚖️ Поддержка", url: this.TG_SUPPORT_LINK }],
                ];
            } else {
                message = `<i>Welcome to <a href="${this.TG_BOT_LINK}">Balzi Rossi</a>, the ultimate nightlife spot for thrill-seekers. Venturing outside at this hour can be dangerous, so step inside and claim everything you need to start fresh with the dawn.</i>`;
                keyboard = [
                    [{ text: "🏆 Play!", web_app: { url: url } }],
                    [{ text: "🥃 Channel", url: this.CHANNELS[language].link }],
                    // [{ text: "💎 Gifts in chat", url: this.CHANNELS[language].link }],
                    [{ text: "🍹 Balance", url: this.TG_RECIEVER_LINK }],
                    [{ text: "👨🏻‍⚖️ Support", url: this.TG_SUPPORT_LINK }],
                ];
            }

            // Send message
            await this.bot.sendMessage(msg.chat.id, message, {
                reply_markup: {
                    inline_keyboard: keyboard,
                },
                parse_mode: "HTML",
                disable_web_page_preview: true,
            });
        } catch (e: any) {
            console.error("TelegramBotService startHandler error:", e.message);
        }
    };

    private getFeeGiftsHandler = async (msg: Message) => {
        try {
            // If admin
            if (msg.from && this.botAdmins.indexOf(msg.from.id) !== -1) {
                const feeGifts = await GiftDBController.getFeeGifts();

                let message = `Fee gifts (${feeGifts.length}):\n\n`;
                for (const gift of feeGifts) {
                    message += `- <b>${gift.slug}</b> (${gift.ticketsPrice} tickets) - <code>${gift.id}</code>\n`;
                }

                await this.bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });
            }
        } catch (e: any) {
            console.error("TelegramBotService getFeeGifts error:", e.message);
        }
    };

    private withdrawFeeGiftHandler = async (msg: Message, giftId: string, toUsername: string) => {
        try {
            // If admin
            if (msg.from && this.botAdmins.indexOf(msg.from.id) !== -1) {
                const gift = await GiftDBController.get(giftId);
                if (!gift) {
                    await this.bot.sendMessage(msg.chat.id, "Gift not found.");
                    return;
                }
                const result = await TelegramService.sendGiftToUser(toUsername, gift.importMsgId);
                if (result.needDM === true) {
                    await this.bot.sendMessage(msg.chat.id, "User needs to start a dialog with the service account.");
                }
                if (result.success === true) {
                    gift.withdrawnAt = new Date();
                    await gift.save();
                    await this.bot.sendMessage(msg.chat.id, "Successfully withdrawn.");
                } else {
                    await this.bot.sendMessage(msg.chat.id, "Failed to withdraw gift.");
                }
            }
        } catch (e: any) {
            console.error("TelegramBotService withdrawFeeGift error:", e.message);
        }
    };

    private setGiftAsWithdrawnHandler = async (msg: Message, giftId: string) => {
        try {
            // If admin
            if (msg.from && this.botAdmins.indexOf(msg.from.id) !== -1) {
                const gift = await GiftDBController.get(giftId);
                if (!gift) {
                    await this.bot.sendMessage(msg.chat.id, "Gift not found.");
                    return;
                }
                gift.withdrawnAt = new Date();
                await gift.save();
                await this.bot.sendMessage(msg.chat.id, "Successfully set as withdrawn.");
            }
        } catch (e: any) {
            await this.bot.sendMessage(msg.chat.id, "Failed to set gift as withdrawn.");
            console.error("TelegramBotService setGiftAsWithdrawnHandler error:", e.message);
        }
    };

    private getGiftBySlugHandler = async (msg: Message, slug: string) => {
        try {
            // If admin
            if (msg.from && this.botAdmins.indexOf(msg.from.id) !== -1) {
                const gift = await GiftDBController.getBySlug(slug);
                if (!gift) {
                    await this.bot.sendMessage(msg.chat.id, "Gift not found.");
                    return;
                }
                let ownerText = null;
                if (gift.userId) {
                    const user = await UserDBController.get(gift.userId);
                    if (user) {
                        ownerText = user.telegramUsername ? `@${user.telegramUsername}` : user.telegramId;
                    }
                }

                let message = `Slug: <b>${gift.slug}</b>`;
                message += `\nID: <code>${gift.id}</code>`;
                message += `\nTickets: <b>${gift.ticketsPrice}</b>`;
                message += `\nOwner: ${ownerText}`;

                if (gift.image) {
                    await this.bot.sendPhoto(msg.chat.id, gift.image, { parse_mode: "HTML", caption: message });
                } else {
                    await this.bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });
                }
            }
        } catch (e: any) {
            await this.bot.sendMessage(msg.chat.id, "Failed to get gift by slug.");
            console.error("TelegramBotService getGiftBySlug error:", e.message);
        }
    };

    private getTopUsersHandler = async (msg: Message, daysAmount: number) => {
        try {
            // If admin
            if (msg.from && this.botAdmins.indexOf(msg.from.id) !== -1) {
                const LIMIT = 30;
                const topUsers = await UserDBController.getTopUsersByParticipations(daysAmount, LIMIT);

                let message = `<b>Top-${LIMIT} users by participations (${daysAmount} days):</b>\n`;
                for (let i = 0; i < topUsers.length; i++) {
                    const user = topUsers[i];
                    const usernameText = user.telegramUsername ? `@${user.telegramUsername}` : `<code>${user.telegramId}</code>`;
                    message += `${i + 1}. ${usernameText} — games: <b>${user.totalLotteriesWon}/${user.totalLotteriesParticipated}</b>, tickets won: <b>${user.totalTicketsWon}</b>, tickets lost: <b>${user.lostTickets}</b>\n`;
                }

                await this.bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });
            }
        } catch (e: any) {
            await this.bot.sendMessage(msg.chat.id, "Failed to get gift by slug.");
            console.error("TelegramBotService getGiftBySlug error:", e.message);
        }
    };

    // ---------------------------- Messages ----------------------------
    sendMessageToUser = async (tgId: string, message: string, inlineKeyboard?: InlineKeyboardButton[][]) => {
        await this.bot.sendMessage(tgId, message, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
        });
    };

    sendWinMessage = async (tgId: string, language: ELanguageCode) => {
        try {
            let message;
            let buttonText;
            if (language === ELanguageCode.RU) {
                message = `🎉 Поздравляем! Вы выиграли в лотерее! 🎁`;
                message += "\n\nПроверьте свои подарки в меню бота.";
                buttonText = "Открыть приложение";
            } else {
                message = `🎉 Congratulations! You have won in the lottery! 🎁`;
                message += "\n\nCheck your gifts in the bot menu.";
                buttonText = "Open Mini App";
            }
            const keyboard: InlineKeyboardButton[][] = [[{ text: buttonText, web_app: { url: this.WEB_APP_URL } }]];
            await this.sendMessageToUser(tgId, message, keyboard);
        } catch (e: any) {
            console.error("TelegramBotService sendWinMessage error:", e.message);
        }
    };

    sendLoseMessages = async (users: User[]) => {
        try {
            const messages = {
                [ELanguageCode.EN]: `🥲 Unfortunately, you lost in the lottery.\n\nBetter luck next time!`,
                [ELanguageCode.RU]: `🥲 К сожалению, вы проиграли в лотерее.\n\nВ следующий раз обязательно повезет!`,
            };
            const buttonTexts = {
                [ELanguageCode.EN]: "Open Mini App",
                [ELanguageCode.RU]: "Открыть приложение",
            };

            for (const user of users) {
                const language = user.telegramLanguage;
                const keyboard: InlineKeyboardButton[][] = [[{ text: buttonTexts[language], web_app: { url: this.WEB_APP_URL } }]];
                await this.sendMessageToUser(user.telegramId, messages[language], keyboard);
                await timeout(200);
            }
        } catch (e: any) {
            console.error("TelegramBotService sendWinMessage error:", e.message);
        }
    };

    sendGiftDepositMessage = async (tgId: string, slug: string, language: ELanguageCode) => {
        try {
            let message;
            let buttonText;
            if (language === ELanguageCode.RU) {
                message = `✈️ Вы успешно сделали депозит <b>${slug}</b>`;
                message += "\n\nПроверьте свои подарки в меню бота.";
                buttonText = "Открыть приложение";
            } else {
                message = `✈️ You have successfully deposited <b>${slug}</b>`;
                message += "\n\nCheck your gifts in the bot menu.";
                buttonText = "Open Mini App";
            }

            const keyboard: InlineKeyboardButton[][] = [[{ text: buttonText, web_app: { url: this.WEB_APP_URL } }]];
            await this.sendMessageToUser(tgId, message, keyboard);
        } catch (e: any) {
            console.error("TelegramBotService sendGiftDepositMessage error:", e.message);
        }
    };

    isUserSubscribed = async (tgUserId: string, type: ETgSubscription, language: ELanguageCode): Promise<boolean> => {
        try {
            let chatId;
            if (type === ETgSubscription.CHAT) {
                chatId = this.GROUPS[language].id;
            } else if (type === ETgSubscription.CHANNEL) {
                chatId = this.CHANNELS[language].id;
            }

            if (!chatId) {
                console.error("Invalid subscription type:", type);
                return false;
            }

            const result = await this.bot.getChatMember(chatId, +tgUserId);
            switch (result.status) {
                case "creator":
                case "administrator":
                case "member":
                    return true;
                case "restricted":
                    return !!result.is_member;
                default: // 'left' | 'kicked'
                    return false;
            }
        } catch (e: any) {
            return false;
        }
    };

    getGroupLink(language: ELanguageCode) {
        return this.GROUPS[language].link;
    }

    getChannelLink(language: ELanguageCode) {
        return this.CHANNELS[language].link;
    }
}

export default new TelegramBotService();
