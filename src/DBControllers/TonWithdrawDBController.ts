import TonWithdraw from "../models/TonWithdraw.model";
import { v4 } from "uuid";

class TonWithdrawDBController {
    create = async (hash: string, destWallet: string, comment: string, amount: number, userId: string | null) => {
        try {
            const tonWithdraw = await TonWithdraw.create({
                id: v4(),
                hash,
                destWallet,
                comment,
                amount,
                userId,
            } as TonWithdraw);
            return tonWithdraw;
        } catch (e: any) {
            console.error("TonWithdrawDBController create error:", e.message);
            return null;
        }
    };

    getByHash = async (hash: string) => {
        try {
            const tonWithdraw = await TonWithdraw.findOne({
                where: { hash },
            });
            return tonWithdraw;
        } catch (e: any) {
            console.error("TonWithdrawDBController getByHash error:", e.message);
            return null;
        }
    };

    getUserWithdraws = async (userId: string) => {
        try {
            const withdraws = await TonWithdraw.findAll({
                where: { userId },
                order: [["createdAt", "DESC"]],
            });
            return withdraws;
        } catch (e: any) {
            console.error("TonWithdrawDBController getUserWithdraws error:", e.message);
            return [];
        }
    };
}

export default new TonWithdrawDBController();
