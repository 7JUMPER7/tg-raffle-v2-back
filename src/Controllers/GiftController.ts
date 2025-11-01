import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../helpers/Interfaces";
import { ApiError } from "../error/ApiError";
import UserDBController from "../DBControllers/UserDBController";
import GiftDBController from "../DBControllers/GiftDBController";
import TelegramService from "../services/TelegramService";
import WebsocketNotifier from "../services/websocket/WebsocketNotifier";

class GiftController {
    withdrawGift = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.userPayload?.userId;
            const { giftId } = req.params;

            // Validate user
            if (!userId) {
                return next(ApiError.unauthorized("User not authenticated"));
            }
            const dbUser = await UserDBController.get(userId);
            if (!dbUser) {
                return next(ApiError.notFound("User not found"));
            }

            // Validate gift
            const dbGift = await GiftDBController.get(giftId);
            if (!dbGift) {
                return next(ApiError.notFound("Gift not found"));
            }
            if (dbGift.userId !== dbUser.id) {
                return next(ApiError.badRequest("Gift does not belong to user"));
            }
            if (dbGift.isUsed) {
                return next(ApiError.badRequest(`Gift is already used`));
            }
            if (dbGift.withdrawnAt !== null) {
                return next(ApiError.badRequest(`Gift is already withdrawn`));
            }

            // Withdraw gift
            const result = await TelegramService.sendGiftToUser(dbUser.telegramId, dbGift.importMsgId);
            if (result.success === true) {
                dbGift.withdrawnAt = new Date();
                await dbGift.save();
                await WebsocketNotifier.updateUserGifts(dbUser.id);
            }

            return res.json({
                success: result.success,
                needDM: result.needDM, // Show DM modal on frontend if true
            });
        } catch (e: any) {
            console.error("GiftController withdrawGift error:", e.message);
            next(ApiError.internal(e.message));
        }
    };
}

export default new GiftController();
