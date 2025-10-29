import { NextFunction, Request, Response } from "express";
import { ApiError } from "../error/ApiError";
import JWTService from "../services/JWTService";
import UserDBController from "../DBControllers/UserDBController";
import { checkReferralCode } from "../helpers/Helpers";
import { ELanguageCode } from "../helpers/Enums";

class AuthController {
    authenticate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const initDataString = req.headers["init-data-string"];
            if (!initDataString) {
                return next(ApiError.badRequest("No WebAppInitData"));
            }
            const params = new URLSearchParams(initDataString.toString());
            const initUser = params.get("user");
            if (!initUser) {
                return next(ApiError.badRequest("No initUser"));
            }
            let telegramId = JSON.parse(initUser).id;
            if (!telegramId) {
                return next(ApiError.badRequest("telegramId not found"));
            }
            telegramId = telegramId.toString();

            const user = await UserDBController.getByTGId(telegramId);
            if (!user) {
                return next(ApiError.notFound("User not found"));
            }

            const accessToken = JWTService.generateToken({ userId: user.id });
            return res.json({ accessToken });
        } catch (e: any) {
            console.error(e.message);
            next(ApiError.internal(e.message));
        }
    };

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { referrerCode } = req.body;

            const initDataString = req.headers["init-data-string"];
            if (!initDataString) {
                return next(ApiError.badRequest("No WebAppInitData"));
            }
            const params = new URLSearchParams(initDataString.toString());
            const initUser = params.get("user");
            if (!initUser) {
                return next(ApiError.badRequest("No initUser"));
            }
            const initUserParsed = JSON.parse(initUser);
            let telegramId = initUserParsed.id;
            if (!telegramId) {
                return next(ApiError.badRequest("telegramId not found"));
            }
            telegramId = telegramId.toString();
            const username = initUserParsed.username;
            const name = initUserParsed.first_name;
            const photoUrl = initUserParsed.photo_url;
            const language =
                initUserParsed.language_code && Object.values(ELanguageCode).includes(initUserParsed.language_code)
                    ? initUserParsed.language_code
                    : ELanguageCode.EN;

            let referrerId;
            if (referrerCode && checkReferralCode(referrerCode)) {
                const referrer = await UserDBController.getByReferralCode(referrerCode.toString());
                if (referrer) {
                    referrerId = referrer.id;
                }
            }

            const dbUser = await UserDBController.getByTGId(telegramId);
            if (dbUser) {
                return next(ApiError.badRequest("User already exists"));
            }

            const user = await UserDBController.create(telegramId, username, name, photoUrl, language, referrerId);
            if (!user) {
                return next(ApiError.internal("User registration failed"));
            }

            const accessToken = JWTService.generateToken({ userId: user.id });
            return res.json({ accessToken });
        } catch (e: any) {
            console.error(e.message);
            next(ApiError.internal(e.message));
        }
    };
}

export default new AuthController();
