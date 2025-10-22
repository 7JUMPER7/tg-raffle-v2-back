import TonDeposit from "../models/TonDeposit.model";
import { v4 } from "uuid";

class TonDepositDBController {
    create = async (hash: string, srcWallet: string, comment: string, amount: number, userId: string | null) => {
        try {
            const tonDeposit = await TonDeposit.create({
                id: v4(),
                hash,
                srcWallet,
                comment,
                amount,
                userId,
            } as TonDeposit);
            return tonDeposit;
        } catch (e: any) {
            console.error("TonDepositDBController create error:", e.message);
            return null;
        }
    };

    getByHash = async (hash: string) => {
        try {
            const tonDeposit = await TonDeposit.findOne({
                where: { hash },
            });
            return tonDeposit;
        } catch (e: any) {
            console.error("TonDepositDBController getByHash error:", e.message);
            return null;
        }
    };

    getUserDeposits = async (userId: string) => {
        try {
            const deposits = await TonDeposit.findAll({
                where: { userId },
                order: [["createdAt", "DESC"]],
            });
            return deposits;
        } catch (e: any) {
            console.error("TonDepositDBController getUserDeposits error:", e.message);
            return [];
        }
    };
}

export default new TonDepositDBController();
