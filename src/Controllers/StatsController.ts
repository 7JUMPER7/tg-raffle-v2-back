import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../helpers/Interfaces";
import { ApiError } from "../error/ApiError";
import LotteryDBController from "../DBControllers/LotteryDBController";

class StatsController {
    getLatestParticipations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const lotteries = await LotteryDBController.getLatestLotteries();
            return res.json(lotteries);
        } catch (e: any) {
            console.error("StatsController getLatestParticipations error:", e.message);
            next(ApiError.internal(e.message));
        }
    };
}

export default new StatsController();
