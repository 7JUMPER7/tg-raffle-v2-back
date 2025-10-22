import { Op } from "sequelize";
import { ELotteryStatus } from "../helpers/Enums";
import { TLotteryParsed, TLotteryParticipation, TLuckyOne, TUser } from "../helpers/Types";
import Lottery from "../models/Lottery.model";
import { v4 } from "uuid";
import UserDBController from "./UserDBController";
import GiftDBController from "./GiftDBController";

class LotteryDBController {
    create = async () => {
        try {
            const lottery = await Lottery.create({
                id: v4(),
                status: ELotteryStatus.PENDING,
            } as Lottery);
            return lottery;
        } catch (e: any) {
            console.error("LotteryDBController create error:", e.message);
            return null;
        }
    };

    get = async (id: string, withParticipations: boolean = false) => {
        try {
            const lottery = await Lottery.findOne({
                where: { id },
                include: withParticipations
                    ? [
                          { association: "participations", separate: true, order: [["createdAt", "ASC"]], include: ["gift", "user"] },
                          { association: "winParticipation", include: ["gift"] },
                          "winner",
                      ]
                    : [{ association: "winParticipation", include: ["gift"] }, "winner"],
            });
            if (!lottery) {
                console.error("LotteryDBController get error: Lottery not found with id:", id);
                return null;
            }
            return lottery;
        } catch (e: any) {
            console.error("LotteryDBController get error:", e.message);
            return null;
        }
    };

    getActive = async () => {
        try {
            const lottery = await Lottery.findOne({
                where: { status: ELotteryStatus.PENDING },
                include: ["participations", "winner"],
                order: [["createdAt", "ASC"]],
            });
            return lottery;
        } catch (e: any) {
            console.error("LotteryDBController getActiveBySize error:", e.message);
            return null;
        }
    };

    getLotteriesToClose = async () => {
        try {
            const lotteries = await Lottery.findAll({
                include: [
                    {
                        association: "participations",
                        include: ["gift"],
                    },
                ],
                where: {
                    status: ELotteryStatus.PENDING,
                    winnerId: null,
                    expiresAt: { [Op.lte]: new Date() },
                },
            });
            return lotteries;
        } catch (e: any) {
            console.error("LotteryDBController getLotteriesToClose error:", e.message);
            return [];
        }
    };

    parseLottery = (lottery: Lottery): TLotteryParsed => {
        let winner: TUser | undefined;
        let winParticipation: TLotteryParticipation | undefined;
        if (lottery.winner) {
            if (lottery.isWinnerAnonymous === true) {
                winner = {
                    tgId: "0",
                    displayName: "Anonymous",
                    image: undefined,
                };
            } else {
                winner = UserDBController.parseUser(lottery.winner);
            }
        }
        if (lottery.winParticipation) {
            const wp = lottery.winParticipation;
            winParticipation = {
                id: wp.id,
                isAnon: wp.isAnonymous,
                user: undefined,
                gift: {
                    slug: wp.gift.slug,
                    image: wp.gift.image,
                    tickets: wp.gift.ticketsPrice,
                },
                createdAt: wp.createdAt,
            };
        }

        return {
            id: lottery.id,
            status: lottery.status,
            expiresAt: lottery.expiresAt,
            participations:
                lottery.participations?.map((p) => {
                    return {
                        id: p.id,
                        isAnon: p.isAnonymous,
                        user: p.user && !p.isAnonymous ? UserDBController.parseUser(p.user) : undefined,
                        gift: GiftDBController.parseGift(p.gift),
                        createdAt: p.createdAt,
                    } as TLotteryParticipation;
                }) ?? [],
            winner,
            winParticipation,
        };
    };

    getParsed = async (id: string): Promise<TLotteryParsed | null> => {
        try {
            const lottery = await this.get(id, true);
            if (!lottery) return null;
            return this.parseLottery(lottery);
        } catch (e: any) {
            console.error("LotteryDBController getParsed error:", e.message);
            return null;
        }
    };

    getLuckyOnes = async (limit: number = 30): Promise<TLuckyOne[]> => {
        try {
            const lotteries = await Lottery.findAll({
                where: {
                    [Op.or]: [{ status: ELotteryStatus.FINISHED }, { status: ELotteryStatus.UNCLAIMED }],
                },
                include: [{ association: "participations", separate: true, include: ["gift", "user"] }, "winner"],
                order: [["createdAt", "DESC"]],
                limit,
            });

            const parsedLotteries = lotteries.map((lottery) => {
                const winner = lottery.winner && !lottery.isWinnerAnonymous ? UserDBController.parseUser(lottery.winner) : undefined;
                const luckyOne: TLuckyOne = {
                    isAnon: lottery.isWinnerAnonymous,
                    user: winner,
                    gifts: lottery.participations.map((p) => {
                        return { ...GiftDBController.parseGift(p.gift), tickets: p.ticketsAmount };
                    }),
                    totalTickets: lottery.participations.reduce((acc, p) => acc + p.ticketsAmount, 0),
                    totalParticipations: lottery.participations.length,
                };
                return luckyOne;
            });
            return parsedLotteries;
        } catch (e: any) {
            console.error("LotteryDBController getLuckyOnes error:", e.message);
            return [];
        }
    };
}

export default new LotteryDBController();
