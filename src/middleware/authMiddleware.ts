import { NextFunction, Response } from "express";
import { ApiError } from "../error/ApiError";
import JWTService from "../services/JWTService";
import { AuthenticatedRequest } from "../helpers/Interfaces";

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(ApiError.badRequest("no auth token"));
        }

        const accessToken = authHeader.split(" ")[1];
        if (!accessToken) {
            return next(ApiError.badRequest("no auth token"));
        }

        const userData = JWTService.verifyToken(accessToken);
        if (typeof userData === "string") {
            return next(ApiError.forbidden("wrong access token"));
        }

        req.userPayload = userData;
        next();
    } catch (e: any) {
        return next(ApiError.internal("authorization error"));
    }
};
