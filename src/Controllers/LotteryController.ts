import { NextFunction, Response } from "express";
import { ApiError } from "../error/ApiError";
import LotteryDBController from "../DBControllers/LotteryDBController";
import { ELotteryStatus, EWebSocketMessage } from "../helpers/Enums";
import { TGift, TLotteryParsed } from "../helpers/Types";
import ParticipationDBController from "../DBControllers/ParticipationDBController";
import UserDBController from "../DBControllers/UserDBController";
import GiftDBController from "../DBControllers/GiftDBController";
import LotteryWebSocketService from "../services/LotteryWebSocketService";
import { TWebSocketMessage, TWebSocketParticipation } from "../helpers/WSTypes";
import { AuthenticatedRequest } from "../helpers/Interfaces";
import Gift from "../models/Gift.model";
import LotteryParticipation from "../models/LotteryParticipation.model";
import XGiftAPI from "../API/XGiftAPI";
import TelegramBotService from "../services/TelegramBotService";
import {
    LOTTERY_SPIN_ANIMATION_LENGTH,
    MIN_USERS_TO_CLOSE_LOTTERY,
    POINTS_AMOUNT,
    SECONDS_TO_EXPIRE,
    SERVICE_FEE_PERCENT,
} from "../configVars";

// Participate in the lottery task class
class ParticipateTask {
    userId: string;
    betGifts: Gift[];
    res: Response;
    next: NextFunction;
    constructor(userId: string, betGifts: Gift[], res: Response, next: NextFunction) {
        this.userId = userId;
        this.betGifts = betGifts;
        this.res = res;
        this.next = next;
    }
}

class LotteryController {
    private taskQueue: ParticipateTask[] = [];
    private processing = false;

    // Participate endpoint (runs asynchronously)
    participateRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.userPayload?.userId;
            if (!userId) {
                return next(ApiError.unauthorized("User not authenticated"));
            }

            const { giftIds } = req.body;
            if (!giftIds) {
                return next(ApiError.badRequest("Missing required parameters"));
            }

            if (giftIds.length === 0) {
                return next(ApiError.badRequest("No gifts provided"));
            }

            const dbUser = await UserDBController.get(userId);
            if (!dbUser) {
                return next(ApiError.notFound("User not found"));
            }

            // Check gifts
            const dbGifts = await GiftDBController.getBatch(giftIds);
            if (dbGifts.length !== giftIds.length) {
                return next(ApiError.notFound("Some gifts not found"));
            }
            for (const gift of dbGifts) {
                if (gift.userId !== dbUser.id) {
                    return next(ApiError.badRequest(`Gift ${gift.slug} does not belong to user`));
                } else if (gift.isUsed) {
                    return next(ApiError.badRequest(`Gift ${gift.slug} is already used`));
                } else if (gift.withdrawnAt !== null) {
                    return next(ApiError.badRequest(`Gift ${gift.slug} is already withdrawn`));
                }
                const tonPrice = await XGiftAPI.getGiftTonPrice(gift.slug, gift.backdropColor);
                if (tonPrice <= 0) {
                    return next(ApiError.badRequest(`Gift ${gift.slug} price not found`));
                }
                gift.tonPrice = tonPrice;
                await gift.save();
            }

            // Add participation task to queue
            this.taskQueue.push(new ParticipateTask(dbUser.id, dbGifts, res, next));
            this.processQueue();
        } catch (e: any) {
            console.error("LotteryController participateRequest error:", e.message);
            return next(ApiError.internal(e.message));
        }
    };

    // Check the win lottery request (runs asynchronously)
    checkWinRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.userPayload?.userId;
            if (!userId) {
                return next(ApiError.unauthorized("User not authenticated"));
            }

            const dbUser = await UserDBController.get(userId);
            if (!dbUser) {
                return next(ApiError.notFound("User not found"));
            }

            dbUser.wonLotteryId = null;
            await dbUser.save();

            return res.json({ success: true });
        } catch (e: any) {
            console.error("LotteryController checkWinRequest error:", e.message);
            return next(ApiError.internal(e.message));
        }
    };

    // ---------------------------------- Process the queue of tasks ----------------------------------
    private async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.taskQueue.length) {
            const task = this.taskQueue.shift()!;
            if (task instanceof ParticipateTask) {
                const { userId, betGifts, res, next } = task;
                try {
                    const result = await this.participate(userId, betGifts);
                    res.json({ success: true, result });
                } catch (e: any) {
                    if (e instanceof ApiError) {
                        next(e);
                    } else {
                        next(ApiError.internal(e.message));
                    }
                }
            }
        }

        this.processing = false;
    }

    // Participate function (runs synchronously)
    participate = async (userId: string, betGifts: Gift[]) => {
        // Get active lotteries by size
        let userParticipations = [];

        let lottery = await LotteryDBController.getActive();
        if (!lottery) {
            lottery = await LotteryDBController.create();
            if (lottery) {
                lottery.participations = [];
            } else {
                throw ApiError.internal("Failed to create new lottery");
            }
        }

        const user = await UserDBController.get(userId);
        if (lottery.status !== ELotteryStatus.PENDING) {
            throw ApiError.badRequest("Lottery is not active");
        }
        if (!user) {
            throw ApiError.notFound("User not found");
        }

        // Participate in the lottery
        const participatedGifts: TGift[] = [];
        for (const gift of betGifts) {
            const participation = await ParticipationDBController.create(user.id, lottery.id, gift.id, gift.tonPrice);
            if (participation) {
                userParticipations.push(participation);
                participatedGifts.push(GiftDBController.parseGift(gift));
            }
        }
        user.enteredLotteryId = lottery.id;
        await user.save();

        if (lottery.expiresAt === null) {
            const totalParticipations = [...lottery.participations, ...userParticipations];
            const uniqueUsers = new Set(totalParticipations.map((p) => p.userId));
            if (uniqueUsers.size >= MIN_USERS_TO_CLOSE_LOTTERY) {
                lottery.expiresAt = new Date(Date.now() + SECONDS_TO_EXPIRE * 1000);
                await lottery.save();
            }
        }

        // Broadcast participation message to WebSocket clients
        const wsMessage: TWebSocketMessage<TWebSocketParticipation> = {
            type: EWebSocketMessage.PARTICIPATION,
            data: {
                lotteryId: lottery.id,
                expiresAt: lottery.expiresAt,
                user: UserDBController.parseUser(user),
                gifts: participatedGifts,
                createdAt: new Date(),
            },
        };
        LotteryWebSocketService.broadcastMessage(lottery.id, wsMessage);

        return userParticipations;
    };

    // Close lottery function where the winner is chosen
    closeLottery = async (lotteryId: string) => {
        try {
            const lottery = await LotteryDBController.get(lotteryId, true);
            if (!lottery) {
                throw new Error("Lottery not found");
            }
            if (lottery.winnerId) {
                throw new Error("Lottery already has a winner");
            }
            if (!lottery.expiresAt) {
                throw new Error("Lottery expiration date is not set");
            }
            console.log("-------------- Closing lottery:", lotteryId, "--------------");

            // Calculate users tickets
            let participantTickets = new Map<string, number>();
            for (const participation of lottery.participations) {
                const tickets = participantTickets.get(participation.userId);
                if (tickets !== undefined) {
                    participantTickets.set(participation.userId, tickets + XGiftAPI.tonToTickets(participation.tonAmount));
                } else {
                    participantTickets.set(participation.userId, XGiftAPI.tonToTickets(participation.tonAmount));
                }
            }

            // Choose a winner weighted by ticket counts
            const totalTickets = Array.from(participantTickets.values()).reduce((sum, t) => sum + t, 0);
            console.log("Total tickets:", totalTickets);
            const randomTicket = Math.floor(Math.random() * totalTickets) + 1;
            console.log("Random ticket number:", randomTicket);

            let winnerUserId: string | null = null;
            let cumulative = 0;
            for (const [userId, tickets] of participantTickets) {
                cumulative += tickets;
                if (randomTicket <= cumulative) {
                    winnerUserId = userId;
                    break;
                }
            }
            if (!winnerUserId) {
                throw new Error("Failed to select a winner");
            }
            console.log("Winner selected:", winnerUserId);

            // Set winner id
            lottery.winnerId = winnerUserId;
            // Set random winner participation id
            const winnerParticipations = lottery.participations.filter((p) => p.userId === winnerUserId);
            const randomIndex = Math.floor(Math.random() * winnerParticipations.length);
            lottery.winParticipationId = winnerParticipations[randomIndex].id;
            // Update lottery status
            lottery.status = ELotteryStatus.FINISHED;
            await lottery.save();

            // Get the most expensive gifts that is lower than SERVICE_FEE_PERCENT of total gifts price
            const totalGiftsPrice = lottery.participations.reduce((sum, p) => sum + p.tonAmount, 0);
            const serviceFeeLimit = (totalGiftsPrice * SERVICE_FEE_PERCENT) / 100;
            const feeGifts: LotteryParticipation[] = [];
            let feeGiftsTonAmount = 0;
            lottery.participations
                .filter((p) => p.tonAmount <= serviceFeeLimit)
                .sort((a, b) => b.tonAmount - a.tonAmount)
                .forEach((p) => {
                    if (feeGiftsTonAmount + p.tonAmount <= serviceFeeLimit) {
                        feeGifts.push(p);
                        feeGiftsTonAmount += p.tonAmount;
                    }
                });
            console.log(
                "Fee gifts:",
                feeGifts.map((p) => p.gift.id)
            );

            // Transfer gifts to the winner and service
            for (const participation of lottery.participations) {
                participation.gift.isUsed = false;
                const isServiceGift = feeGifts.findIndex((p) => p.gift.id === participation.gift.id) !== -1;
                participation.gift.userId = isServiceGift ? null : winnerUserId;
                await participation.gift.save();
            }

            // Update winner user
            const winnerUser = await UserDBController.get(winnerUserId);
            if (winnerUser) {
                winnerUser.wonLotteryId = lottery.id;
                await UserDBController.updateBalances(winnerUser, 0, POINTS_AMOUNT.win);

                // Update referrer
                if (winnerUser.referrerId && feeGiftsTonAmount !== 0) {
                    const referrer = await UserDBController.get(winnerUser.referrerId);
                    if (referrer) {
                        // TODO: add correct referral reward
                        // const refTicketsAmount = Math.floor((feeGiftsTicketsAmount * REFERRAL_FEE_PERCENT) / 100);
                        // console.log("Referrer", referrer.id, "referral tickets:", refTicketsAmount);
                        // await UserDBController.updateBalances(referrer, 0, 0, refTicketsAmount);
                    }
                }

                setTimeout(async () => {
                    // Notify winner
                    await TelegramBotService.sendWinMessage(winnerUser.telegramId, winnerUser.telegramLanguage);
                    // Notify losers
                    const losers = await ParticipationDBController.getLosers(lottery.id, winnerUserId);
                    await TelegramBotService.sendLoseMessages(losers);
                }, LOTTERY_SPIN_ANIMATION_LENGTH);
            }

            // Update points for lottery participants
            const updatedParticipants = await UserDBController.updateParticipantsPointsBatch(lottery.id, POINTS_AMOUNT.spin);
            console.log("Users with updated points:", updatedParticipants);

            // Leave users from lottery
            const affectedUsersCount = await UserDBController.leaveUsersFromLottery(lottery.id);
            console.log("Users left lottery:", affectedUsersCount);

            // Broadcast close message to WebSocket clients
            const updatedLottery = await LotteryDBController.getParsed(lottery.id);
            if (!updatedLottery) {
                throw new Error("Failed to get updated lottery");
            }
            const wsMessage: TWebSocketMessage<TLotteryParsed> = {
                type: EWebSocketMessage.LOTTERY_CLOSE,
                data: updatedLottery,
            };
            LotteryWebSocketService.broadcastMessage(lottery.id, wsMessage);

            return lottery;
        } catch (e: any) {
            console.error("LotteryController closeLottery error:", e.message);
            return null;
        }
    };
}

export default new LotteryController();
