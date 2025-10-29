import { NextFunction, Response, Request } from "express";
import { ApiError } from "../error/ApiError";
import CryptoJS from "crypto-js";

if (!process.env.TELEGRAM_BOT_API_KEY) {
    console.error("TELEGRAM_BOT_API_KEY not set");
    process.exit(1);
}

export const tgAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const initDataString = req.headers["init-data-string"];
        if (!initDataString) {
            return next(ApiError.badRequest("no WebAppInitData"));
        }
        const params = new URLSearchParams(initDataString.toString());
        const hash = params.get("hash");
        if (!hash) {
            return next(ApiError.badRequest("no hash"));
        }

        const dataCheckString = [...params.entries()]
            .filter(([key]) => key !== "hash")
            .map(([key, value]) => `${key}=${value}`)
            .sort()
            .join("\n");

        const secretKey = CryptoJS.HmacSHA256(process.env.TELEGRAM_BOT_API_KEY!, "WebAppData");
        const signature = CryptoJS.HmacSHA256(dataCheckString, secretKey);
        const computedHash = signature.toString(CryptoJS.enc.Hex);

        // TODO: uncomment
        if (computedHash !== hash) {
            return next(ApiError.forbidden("wrong WebAppInitData"));
        }

        next();
    } catch (e: any) {
        return next(ApiError.internal("authorization error"));
    }
};
