import { EWebSocketMessage, TBalancesUpdate } from "../../helpers/WSTypes";
import UnifiedWebsocketService from "./UnifiedWebsocketService";

class WebsocketNotifier {
    updateUserBalances = (userId: string, balances: TBalancesUpdate) => {
        try {
            UnifiedWebsocketService.sendToUser(userId, {
                type: EWebSocketMessage.BALANCE_UPDATE,
                data: balances,
            });
        } catch (e: any) {
            console.error("WebsocketNotifier updateUserBalances error:", e.message);
        }
    };
}

export default new WebsocketNotifier();
