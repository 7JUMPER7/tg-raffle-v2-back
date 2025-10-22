import dotenv from "dotenv";
dotenv.config();
import sequelize from "../db";
import User from "../models/User.model";
import { Op } from "sequelize";

const main = async () => {
    await sequelize.authenticate();
    await sequelize.sync();

    const referrersWithBalance = await User.findAll({ where: { referralTicketsAmount: { [Op.gt]: 0 } } });
    console.log("Referrers with referral balance:", referrersWithBalance.length);

    for (const referrer of referrersWithBalance) {
        console.log("Referrer:", referrer.id, "| Referral balance:", referrer.referralTicketsAmount);
    }

    process.exit(0);
};

main();
