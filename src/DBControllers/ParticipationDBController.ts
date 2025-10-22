import { Op } from "sequelize";
import Gift from "../models/Gift.model";
import LotteryParticipation from "../models/LotteryParticipation.model";
import { v4 } from "uuid";

class ParticipationDBController {
    create = async (userId: string, lotteryId: string, giftId: string, ticketsAmount: number, isAnonymous: boolean) => {
        try {
            const participation = await LotteryParticipation.create({
                id: v4(),
                userId,
                lotteryId,
                giftId,
                ticketsAmount,
                isAnonymous,
            } as LotteryParticipation);
            await Gift.update({ isUsed: true }, { where: { id: giftId } });
            return participation;
        } catch (e: any) {
            console.error("ParticipationDBController create error:", e.message);
            return null;
        }
    };

    getAllByLotteryId = async (lotteryId: string) => {
        try {
            const participations = await LotteryParticipation.findAll({
                where: { lotteryId },
                include: ["user", "gift"],
            });
            return participations;
        } catch (e: any) {
            console.error("ParticipationDBController getAllByLotteryId error:", e.message);
            return [];
        }
    };

    getUserParticipations = async (userId: string, lotteryId: string) => {
        try {
            const participations = await LotteryParticipation.findAll({
                where: { userId, lotteryId },
                include: ["gift"],
            });
            return participations;
        } catch (e: any) {
            console.error("ParticipationDBController getUserParticipations error:", e.message);
            return [];
        }
    };

    getLosers = async (lotteryId: string, winnerId: string) => {
        try {
            const participations = await LotteryParticipation.findAll({
                where: { lotteryId, userId: { [Op.ne]: winnerId } },
                include: ["user"],
            });
            return participations.map((p) => p.user);
        } catch (e: any) {
            console.error("ParticipationDBController getLosers error:", e.message);
            return [];
        }
    };
}

export default new ParticipationDBController();
