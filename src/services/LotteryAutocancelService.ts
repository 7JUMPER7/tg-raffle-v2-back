import LotteryController from "../Controllers/LotteryController";
import LotteryDBController from "../DBControllers/LotteryDBController";
import { timeout } from "../helpers/Helpers";
import Lottery from "../models/Lottery.model";

class LotteryAutocloseService {
    private DELAY_MS = 1000; // 1 second

    closeLottery = async (lottery: Lottery) => {
        try {
            if (lottery.expiresAt && lottery.expiresAt.getTime() <= Date.now() - 1000) {
                await LotteryController.closeLottery(lottery.id);
            }
        } catch (e: any) {
            console.error("LotteryAutocancelService closeLottery error:", e.message);
        }
    };

    closeLotteries = async () => {
        const lotteriesToClose = await LotteryDBController.getLotteriesToClose();
        for (const lottery of lotteriesToClose) {
            await this.closeLottery(lottery);
        }
    };

    startLoop = async () => {
        await timeout(3000);
        try {
            await this.closeLotteries();
        } catch (e: any) {
            console.error("LotteryAutocloseService startLoop:", e.message);
        } finally {
            await timeout(this.DELAY_MS);
            this.startLoop();
        }
    };
}

export default new LotteryAutocloseService();
