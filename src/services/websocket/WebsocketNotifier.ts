import { TLotteryParsed } from "../../helpers/Types";
import { EWebSocketMessage, TBalancesUpdate, TWebSocketParticipation } from "../../helpers/WSTypes";
import User from "../../models/User.model";
import UnifiedWebsocketService from "./UnifiedWebsocketService";

class WebsocketNotifier {
    // Notify all users about new lottery
    newLottery = (lottery: TLotteryParsed) => {
        try {
            UnifiedWebsocketService.sendToAll({
                type: EWebSocketMessage.NEW_LOTTERY,
                data: lottery,
            });
        } catch (e: any) {
            console.error("WebsocketNotifier newLottery error:", e.message);
        }
    };

    // Notify all users about new lottery participation
    newLotteryParticipation = (participation: TWebSocketParticipation) => {
        try {
            UnifiedWebsocketService.sendToAll({
                type: EWebSocketMessage.PARTICIPATION,
                data: participation,
            });
        } catch (e: any) {
            console.error("WebsocketNotifier newLotteryParticipation error:", e.message);
        }
    };

    // Notify all users about lottery close
    lotteryClose = (lottery: TLotteryParsed) => {
        try {
            UnifiedWebsocketService.sendToAll({
                type: EWebSocketMessage.LOTTERY_CLOSE,
                data: lottery,
            });
        } catch (e: any) {
            console.error("WebsocketNotifier lotteryClose error:", e.message);
        }
    };

    // Update specific user balances
    updateUserBalances = (user: User) => {
        try {
            UnifiedWebsocketService.sendToUser(user.id, {
                type: EWebSocketMessage.BALANCE_UPDATE,
                data: {
                    ton: user.tonBalance,
                    stars: user.starsBalance,
                    points: user.pointsBalance,
                } as TBalancesUpdate,
            });
        } catch (e: any) {
            console.error("WebsocketNotifier updateUserBalances error:", e.message);
        }
    };
}

export default new WebsocketNotifier();
