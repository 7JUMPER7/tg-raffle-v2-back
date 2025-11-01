import { Api, TelegramClient } from "telegram";
import GiftDBController from "../DBControllers/GiftDBController";
import UserDBController from "../DBControllers/UserDBController";
import XGiftAPI from "../API/XGiftAPI";
import { StringSession } from "telegram/sessions";
import TelegramBotService from "./TelegramBotService";
import WebsocketNotifier from "./websocket/WebsocketNotifier";

if (!process.env.TELEGRAM_APP_ID) {
    throw new Error("TELEGRAM_APP_ID not set");
}
if (!process.env.TELEGRAM_APP_HASH) {
    throw new Error("TELEGRAM_APP_HASH not set");
}
if (!process.env.TELEGRAM_SESSION_STRING) {
    throw new Error("TELEGRAM_SESSION_STRING not set");
}

class TelegramService {
    private client: TelegramClient;

    constructor() {
        const apiId = +process.env.TELEGRAM_APP_ID!;
        const apiHash = process.env.TELEGRAM_APP_HASH!;
        const session = process.env.TELEGRAM_SESSION_STRING!;
        this.client = new TelegramClient(new StringSession(session), apiId, apiHash, {
            autoReconnect: true,
            connectionRetries: 10,
            retryDelay: 2000,
        });
    }

    checkForSkippedGifts = async () => {
        try {
            console.log("Checking for skipped gifts...");
            if (!this.client.connected) {
                await this.client.connect();
            }
            // Fetch newest dialogs
            const dialogsList = await this.client.getDialogs({ limit: 100 });
            for (const dialog of dialogsList) {
                // Fetch messages only if unread dialog
                if (dialog.unreadCount > 0 && dialog.entity) {
                    try {
                        // Fetch messages
                        const messages = await this.client.getMessages(dialog.entity, {
                            limit: dialog.unreadCount + 1,
                            minId: 0,
                        });
                        // Analyze each message
                        for (const msg of messages) {
                            if (msg.action && msg.out === false && msg.action instanceof Api.MessageActionStarGiftUnique) {
                                await this.processNewGift(msg, msg.action);
                            }
                        }
                        // Read dialog
                        await this.client.markAsRead(dialog.entity);
                    } catch (e: any) {
                        console.error("Error processing dialog:", dialog.title, e.message);
                    }
                }
            }
            console.log("Check is completed");
        } catch (e: any) {
            throw new Error("TelegramService checkForSkippedGifts error: " + e.message);
        }
    };

    listenGiftMessages = async () => {
        try {
            console.log("Start listening for gift transfers");
            if (!this.client.connected) {
                await this.client.connect();
            }
            // New messages handler
            this.client.addEventHandler(async (event) => {
                const message = event.message;
                // Parse gift transfer
                if (message && message.out === false && message.action && message.action instanceof Api.MessageActionStarGiftUnique) {
                    await this.processNewGift(message, message.action);
                }
                // Read message
                const peer =
                    event instanceof Api.UpdateShortMessage
                        ? event.userId
                        : event instanceof Api.UpdateShortChatMessage
                        ? event.chatId
                        : event instanceof Api.UpdateNewMessage
                        ? event.message.peerId
                        : event instanceof Api.UpdateNewChannelMessage
                        ? event.message.peerId
                        : null;
                if (peer) {
                    if (peer instanceof Api.PeerChannel) {
                        await this.client.invoke(
                            new Api.channels.ReadHistory({
                                channel: peer.channelId,
                                maxId: message.id,
                            })
                        );
                    } else {
                        const peerId = peer instanceof Api.PeerUser ? peer.userId : peer instanceof Api.PeerChat ? peer.chatId : peer;
                        await this.client.invoke(
                            new Api.messages.ReadHistory({
                                peer: peerId,
                                maxId: message.id,
                            })
                        );
                    }
                }
            });
        } catch (e: any) {
            throw new Error("TelegramService listenMessages error: " + e.message);
        }
    };

    // Process gift transfer
    processNewGift = async (message: Api.Message, action: Api.MessageActionStarGiftUnique) => {
        try {
            if (!(action.gift instanceof Api.StarGiftUnique) || !(message.peerId instanceof Api.PeerUser)) {
                console.error("Invalid action or message format:", action, message);
                return;
            }

            const gift = action.gift;
            const userId = message.peerId.userId.toString();
            const dbGift = await GiftDBController.getBySlug(gift.slug);
            if (!dbGift) {
                console.log(`New gift transfer from ${userId}:`, action.gift.slug, "| message id:", message.id);

                // Parse gift attributes
                const backgroundColor = gift.attributes.find((a) => a instanceof Api.StarGiftAttributeBackdrop)?.name;

                // Check user
                let dbUser = await UserDBController.getByTGId(userId);
                if (!dbUser) {
                    const userInfo = await this.fetchUserInfo(userId);
                    const { username, name } = userInfo || {};
                    dbUser = await UserDBController.create(userId, username, name);
                }
                if (!dbUser) {
                    console.error("User not found:", userId);
                    return;
                }

                TelegramBotService.sendGiftDepositMessage(dbUser.telegramId, gift.slug, dbUser.telegramLanguage);
                const tonPrice = await XGiftAPI.getGiftTonPrice(gift.slug, backgroundColor);
                await GiftDBController.create(dbUser.id, userId, message.id, gift.slug, tonPrice, backgroundColor);
                await WebsocketNotifier.updateUserGifts(dbUser.id);
            }
        } catch (e: any) {
            console.error("TelegramService processNewGift error:", e.message);
        }
    };

    // Withdraw gift function
    sendGiftToUser = async (userTelegramId: string, giftMsgId: number): Promise<{ success: boolean; needDM: boolean }> => {
        try {
            if (!this.client.connected) {
                await this.client.connect();
            }

            let toId: Api.TypeInputPeer;
            try {
                toId = await this.client.getInputEntity(userTelegramId);
            } catch (e: any) {
                return {
                    success: false,
                    needDM: true, // User needs to start dialog with service account
                };
            }

            const invoice = new Api.InputInvoiceStarGiftTransfer({
                stargift: new Api.InputSavedStarGiftUser({ msgId: giftMsgId }),
                toId: toId,
            });

            const paymentForm = await this.client.invoke(
                new Api.payments.GetPaymentForm({
                    invoice: invoice,
                })
            );

            await this.client.invoke(
                new Api.payments.SendStarsForm({
                    formId: paymentForm.formId,
                    invoice: invoice,
                })
            );

            return {
                success: true,
                needDM: false,
            };
        } catch (e: any) {
            console.error("TelegramService sendGiftToUser error:", e.message);
            return {
                success: false,
                needDM: false,
            };
        }
    };

    fetchUserGifts = async (userTelegramId: string) => {
        try {
            if (!this.client.connected) {
                await this.client.connect();
            }
            const user = await this.client.getInputEntity(userTelegramId);
            const savedGifts = await this.client.invoke(
                new Api.payments.GetSavedStarGifts({
                    peer: user,
                    offset: "",
                    limit: 100,
                })
            );
            return savedGifts.gifts;
        } catch (e: any) {
            console.error("TelegramService fetchUserGifts error:", e.message);
            throw new Error("Failed to fetch user gifts: " + e.message);
        }
    };

    fetchUserInfo = async (userTelegramId: string) => {
        try {
            if (!this.client.connected) {
                await this.client.connect();
            }
            const user = await this.client.getInputEntity(userTelegramId);
            const usersInfo = await this.client.invoke(new Api.users.GetFullUser({ id: user }));
            if (usersInfo.users.length > 0 && usersInfo.users[0] instanceof Api.User) {
                const info = usersInfo.users[0];
                return {
                    username: info.username,
                    name: info.firstName,
                };
            }
            return null;
        } catch (e: any) {
            console.error("TelegramService fetchUserInfo error:", e.message);
            throw new Error("Failed to fetch user info: " + e.message);
        }
    };
}

export default new TelegramService();
