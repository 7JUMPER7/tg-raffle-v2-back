import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../helpers/Interfaces";
import { ApiError } from "../error/ApiError";
import UserDBController from "../DBControllers/UserDBController";
import LotteryDBController from "../DBControllers/LotteryDBController";
import { TFullUserInfo } from "../helpers/Types";
import { POINTS_AMOUNT } from "../configVars";
import XGiftAPI from "../API/XGiftAPI";
import TelegramBotService from "../services/TelegramBotService";
import { ETgSubscription } from "../helpers/Enums";
import ParticipationDBContoller from "../DBControllers/ParticipationDBController";
import GiftDBController from "../DBControllers/GiftDBController";

class UserController {
    getUserInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.userPayload?.userId;
            if (!userId) {
                return next(ApiError.unauthorized("User not authenticated"));
            }

            const dbUser = await UserDBController.get(userId, true);
            if (!dbUser) {
                return next(ApiError.notFound("User not found"));
            }

            let enteredLottery = null;
            if (dbUser.enteredLotteryId) {
                const participations = await ParticipationDBContoller.getUserParticipations(dbUser.id, dbUser.enteredLotteryId);
                enteredLottery = {
                    lotteryId: dbUser.enteredLotteryId,
                    gifts: participations.map((p) => GiftDBController.parseGift(p.gift)),
                };
            }

            let wonLottery = null;
            if (dbUser.wonLotteryId) {
                const dbLottery = await LotteryDBController.get(dbUser.wonLotteryId, true);
                if (dbLottery) {
                    const result = XGiftAPI.calculateTonToClaim(dbLottery);
                    wonLottery = {
                        lotteryId: dbLottery.id,
                        tonValue: result?.tonValue ?? 0,
                    };
                }
            }

            const parsedUser: TFullUserInfo = {
                id: dbUser.id,
                telegramId: dbUser.telegramId,
                telegramUsername: dbUser.telegramUsername,
                telegramName: dbUser.telegramName,
                telegramImage: dbUser.telegramImage,
                referralCode: dbUser.referralCode,
                gifts: dbUser.gifts.map((g) => {
                    return { id: g.id, slug: g.slug, image: g.image, quality: g.quality, price: g.tonPrice, isUsed: g.isUsed };
                }),
                tonBalance: dbUser.tonBalance,
                starsBalance: dbUser.starsBalance,
                pointsBalance: dbUser.pointsBalance,
                enteredLottery: enteredLottery,
                wonLottery: wonLottery,
                channelLink: TelegramBotService.getChannelLink(dbUser.telegramLanguage),
                subscribedChannel: dbUser.subscribedChannel,
                chatLink: TelegramBotService.getGroupLink(dbUser.telegramLanguage),
                subscribedChat: dbUser.subscribedChat,
            };
            return res.json(parsedUser);
        } catch (e: any) {
            console.error("UserController getUserInfo error:", e.message);
            return next(ApiError.internal(e.message));
        }
    };

    checkChannelSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.userPayload?.userId;
            const { type } = req.query;
            if (!userId) {
                return next(ApiError.unauthorized("User not authenticated"));
            }
            if (!type || typeof type !== "string") {
                return next(ApiError.badRequest("Type not passed"));
            }
            // Check if subscription type is correct
            if (!Object.values(ETgSubscription).includes(type as ETgSubscription)) {
                return next(ApiError.badRequest("Invalid subscription type"));
            }

            const dbUser = await UserDBController.get(userId, true);
            if (!dbUser) {
                return next(ApiError.notFound("User not found"));
            }

            let isUserSubscribed = false;
            switch (type) {
                case ETgSubscription.CHAT: {
                    if (dbUser.subscribedChat === true) {
                        isUserSubscribed = true;
                        break;
                    }
                    let isSubscribed = await TelegramBotService.isUserSubscribed(
                        dbUser.telegramId,
                        ETgSubscription.CHAT,
                        dbUser.telegramLanguage
                    );
                    if (isSubscribed === true) {
                        dbUser.subscribedChat = true;
                        await UserDBController.updateBalances(dbUser, 0, 0, POINTS_AMOUNT.subscribe);
                        isUserSubscribed = true;
                    }
                    break;
                }
                case ETgSubscription.CHANNEL: {
                    if (dbUser.subscribedChannel === true) {
                        isUserSubscribed = true;
                        break;
                    }
                    let isSubscribed = await TelegramBotService.isUserSubscribed(
                        dbUser.telegramId,
                        ETgSubscription.CHANNEL,
                        dbUser.telegramLanguage
                    );
                    if (isSubscribed === true) {
                        dbUser.subscribedChannel = true;
                        await UserDBController.updateBalances(dbUser, 0, 0, POINTS_AMOUNT.subscribe);
                        isUserSubscribed = true;
                    }
                    break;
                }
            }

            return res.json({ isSubscribed: isUserSubscribed });
        } catch (e: any) {
            console.error("UserController checkChannelSubscription error:", e.message);
            return next(ApiError.internal(e.message));
        }
    };
}

export default new UserController();
