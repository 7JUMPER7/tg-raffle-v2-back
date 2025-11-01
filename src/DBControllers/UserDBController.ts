import User from "../models/User.model";
import { v4 } from "uuid";
import * as referralCodes from "referral-codes";
import { UniqueConstraintError, Op, QueryTypes } from "sequelize";
import { TUser } from "../helpers/Types";
import { ELanguageCode } from "../helpers/Enums";
import WebsocketNotifier from "../services/websocket/WebsocketNotifier";
import { TBalancesUpdate } from "../helpers/WSTypes";

class UserDBController {
    create = async (
        telegramId: string,
        telegramUsername?: string,
        telegramName?: string,
        telegramImage?: string,
        telegramLanguage?: ELanguageCode,
        referrerId?: string
    ) => {
        try {
            // Generate referralCode and check if it already exists
            let referralCode;
            for (let i = 0; i < 10; i++) {
                const bufCode = referralCodes
                    .generate({
                        length: 8,
                        count: 1,
                    })[0]
                    .toLowerCase();
                const refUser = await this.getByReferralCode(bufCode);
                if (!refUser) {
                    referralCode = bufCode;
                    break;
                }
            }

            const uuid = v4();
            const user = await User.create({
                id: uuid,
                telegramId,
                telegramUsername,
                telegramName,
                telegramImage,
                telegramLanguage,
                referrerId,
                referralCode,
            } as User);
            return user;
        } catch (e: any) {
            if (e instanceof UniqueConstraintError && e.errors.length > 0) {
                await User.restore({ where: { telegramId } });
                console.log("Restored user with telegramId:", telegramId);
                return await this.get(telegramId);
            }
            console.error("UserDBController create error:", e.message);
            return null;
        }
    };

    get = async (userId: string, withGifts: boolean = false) => {
        try {
            const user = await User.findOne({
                where: {
                    id: userId,
                },
                include: withGifts
                    ? [
                          {
                              association: "gifts",
                              where: {
                                  withdrawnAt: {
                                      [Op.eq]: null,
                                  },
                              },
                              required: false,
                          },
                      ]
                    : [],
            });
            return user;
        } catch (e: any) {
            console.error("UserDBController get error:", e.message);
            return null;
        }
    };

    getByTGId = async (telegramId: string, withGifts: boolean = false) => {
        try {
            const user = await User.findOne({
                where: {
                    telegramId,
                },
                include: withGifts
                    ? [
                          {
                              association: "gifts",
                              where: {
                                  withdrawnAt: {
                                      [Op.eq]: null,
                                  },
                              },
                              required: false,
                          },
                      ]
                    : [],
            });
            return user;
        } catch (e: any) {
            console.error("UserDBController getByTGId error:", e.message);
            return null;
        }
    };

    getByReferralCode = async (referralCode: string) => {
        try {
            const user = await User.findOne({
                where: {
                    referralCode,
                },
            });
            return user;
        } catch (e: any) {
            console.error("UserDBController getByReferralCode error:", e.message);
            return null;
        }
    };

    delete = async (telegramId: string) => {
        try {
            const user = await User.findOne({
                where: {
                    telegramId,
                },
            });
            if (!user) {
                return null;
            }
            await user.destroy();
            return user;
        } catch (e: any) {
            console.error("UserDBController delete error:", e.message);
            return null;
        }
    };

    leaveUsersFromLottery = async (lotteryId: string) => {
        try {
            const [rows] = await User.update(
                { enteredLotteryId: null },
                {
                    where: {
                        enteredLotteryId: lotteryId,
                    },
                }
            );
            return rows;
        } catch (e: any) {
            console.error("UserDBController leaveUsersFromLottery error:", e.message);
            return 0;
        }
    };

    parseUser = (user: User): TUser => {
        return {
            tgId: user.telegramId,
            displayName: user.telegramUsername || user.telegramName || user.telegramId,
            image: user.telegramImage,
        };
    };

    updateBalances = async (user: User, tonBalance: number, starsBalance: number, pointsBalance: number, disableWS: boolean = false) => {
        if (tonBalance !== 0) {
            user.tonBalance = parseFloat((user.tonBalance + tonBalance).toFixed(9));
            if (user.tonBalance < 0) {
                user.tonBalance = 0;
            }
        }
        if (starsBalance !== 0) {
            user.starsBalance = parseFloat((user.starsBalance + starsBalance).toFixed(3));
            if (user.starsBalance < 0) {
                user.starsBalance = 0;
            }
        }
        if (pointsBalance !== 0) {
            user.pointsBalance = parseFloat((user.pointsBalance + pointsBalance).toFixed(3));
            if (user.pointsBalance < 0) {
                user.pointsBalance = 0;
            }
        }
        await user.save();

        if (!disableWS) {
            WebsocketNotifier.updateUserBalances(user.id, {
                ton: user.tonBalance,
                stars: user.starsBalance,
                points: user.pointsBalance,
            });
        }
        return user;
    };

    updateParticipantsPointsBatch = async (lotteryId: string, amount: number): Promise<({ userId: string } & TBalancesUpdate)[]> => {
        try {
            const [_, updatedUsers] = await User.update(
                {
                    pointsBalance: User.sequelize!.literal(`GREATEST("pointsBalance" + ${amount}, 0)`),
                },
                {
                    where: {
                        enteredLotteryId: lotteryId,
                    },
                    returning: true,
                }
            );
            return updatedUsers.map((user) => ({
                userId: user.id,
                ton: user.tonBalance,
                stars: user.starsBalance,
                points: user.pointsBalance,
            }));
        } catch (e: any) {
            console.error("UserDBController updateParticipantsPointsBatch error:", e.message);
            return [];
        }
    };

    getTopUsersByParticipations = async (days: number, limit: number = 30) => {
        try {
            const query = `
                WITH
                    win_totals AS (
                        SELECT
                            sub."winnerId",
                            sub."telegramId",
                            sub."telegramUsername",
                            SUM(sub."ticketsWon") AS "totalTicketsWon",
                            COUNT(sub."lotteryId") AS "totalLotteriesWon"
                        FROM
                            (
                                SELECT
                                    l.id AS "lotteryId",
                                    l."winnerId",
                                    u."telegramId",
                                    u."telegramUsername",
                                    SUM(lp."ticketsAmount") AS "ticketsWon",
                                    l."expiresAt" AS "lotteryFinishDate"
                                FROM
                                    lotteries l
                                    JOIN users u ON u.id = l."winnerId"
                                    JOIN lottery_participations lp ON lp."lotteryId" = l.id
                                WHERE
                                    l."expiresAt" >= NOW() - (INTERVAL '1 day' * $days)
                                GROUP BY
                                    l.id,
                                    l."winnerId",
                                    u."telegramId",
                                    u."telegramUsername",
                                    l."expiresAt"
                            ) sub
                        GROUP BY
                            sub."winnerId",
                            sub."telegramId",
                            sub."telegramUsername"
                    ),
                    participation AS (
                        SELECT
                            lp."userId" AS "userId",
                            COUNT(DISTINCT lp."lotteryId") AS "totalLotteriesParticipated",
                            COALESCE(
                                SUM(
                                    CASE
                                        WHEN l."winnerId" <> lp."userId" THEN lp."ticketsAmount"
                                        ELSE 0
                                    END
                                ),
                                0
                            ) AS "lostTickets"
                        FROM
                            lottery_participations lp
                            JOIN lotteries l ON l.id = lp."lotteryId"
                        WHERE
                            l."expiresAt" >= NOW() - (INTERVAL '1 day' * $days)
                        GROUP BY
                            lp."userId"
                    )
                SELECT
                    wt."winnerId",
                    wt."telegramId",
                    wt."telegramUsername",
                    wt."totalTicketsWon",
                    wt."totalLotteriesWon",
                    COALESCE(p."lostTickets", 0) AS "lostTickets",
                    COALESCE(p."totalLotteriesParticipated", 0) AS "totalLotteriesParticipated"
                FROM
                    win_totals wt
                    LEFT JOIN participation p ON p."userId" = wt."winnerId"
                ORDER BY
                    wt."totalTicketsWon" DESC
                LIMIT $limit;
            `;

            const rows = (await User.sequelize?.query(query, {
                type: QueryTypes.SELECT,
                bind: { days, limit },
            })) as any[];

            return rows.map((r) => ({
                userId: r.winnerId,
                telegramId: r.telegramId,
                telegramUsername: r.telegramUsername,
                totalTicketsWon: Number(r.totalTicketsWon) || 0,
                totalLotteriesWon: Number(r.totalLotteriesWon) || 0,
                lostTickets: Number(r.lostTickets) || 0,
                totalLotteriesParticipated: Number(r.totalLotteriesParticipated) || 0,
            }));
        } catch (e: any) {
            console.error("UserDBController getTopUsersByParticipations error:", e.message);
            return [];
        }
    };
}

export default new UserDBController();
