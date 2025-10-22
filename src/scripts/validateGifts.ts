import dotenv from "dotenv";
dotenv.config();
import sequelize from "../db";
import { Api } from "telegram";
import TelegramService from "../services/TelegramService";
import Gift from "../models/Gift.model";

const main = async () => {
    await sequelize.authenticate();
    await sequelize.sync();

    const SERVICE_ACCOUNT_ID = "";
    const REPAIR = false;
    const serviceGifts = await TelegramService.fetchUserGifts(SERVICE_ACCOUNT_ID); // Returns 100 gifts

    for (const gift of serviceGifts) {
        if (gift.gift instanceof Api.StarGiftUnique) {
            const dbGift = await Gift.findOne({ where: { slug: gift.gift.slug, withdrawnAt: null } });
            if (dbGift && gift.msgId && dbGift.importMsgId !== gift.msgId) {
                console.log("\nFound gift with mismatched:", gift.gift.slug);
                console.log(`DB import message id: ${dbGift.importMsgId} | Actual import message id: ${gift.msgId}`);

                if (REPAIR) {
                    dbGift.importMsgId = gift.msgId;
                    await dbGift.save();
                    console.log("DB gift import message id updated:", dbGift.importMsgId);
                }
            }
        }
    }

    process.exit(0);
};

main();
