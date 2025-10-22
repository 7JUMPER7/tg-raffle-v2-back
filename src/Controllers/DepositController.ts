import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../helpers/Interfaces";
import { ApiError } from "../error/ApiError";
import TonDepositService from "../services/TonDepositService";
import { Address } from "@ton/core";
import UserDBController from "../DBControllers/UserDBController";

class DepositController {
    getDepositAddress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const address = TonDepositService.depositAddress;
            return res.json({ address });
        } catch (e: any) {
            console.error("DepositController getDepositAddress error:", e.message);
            return next(ApiError.internal(e.message));
        }
    };

    withdrawTon = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.userPayload?.userId;
            const { address, amount } = req.body;
            if (!userId) {
                return next(ApiError.unauthorized("User not authenticated"));
            }

            // Validate address
            if (!address) {
                return next(ApiError.badRequest("Address not passed"));
            }
            if (!Address.parse(address)) {
                return next(ApiError.badRequest("Invalid address format"));
            }

            // Validate amount
            if (!amount || isNaN(amount) || amount <= 0) {
                return next(ApiError.badRequest("Invalid amount"));
            }
            const parsedAmount = parseFloat((+amount).toFixed(9));

            // Validate user
            const user = await UserDBController.get(userId);
            if (!user) {
                return next(ApiError.notFound("User not found"));
            }
            if (user.tonBalance < parsedAmount) {
                return next(ApiError.badRequest(`Insufficient TON balance: ${user.tonBalance} < ${parsedAmount}`));
            }

            TonDepositService.addWithdrawal(userId, address, parsedAmount);

            return res.json({ success: true });
        } catch (e: any) {
            console.error("DepositController withdrawTon error:", e.message);
            return next(ApiError.internal(e.message));
        }
    };
}

export default new DepositController();
