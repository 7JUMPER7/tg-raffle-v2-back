import dotenv from "dotenv";
dotenv.config();
import { TelegramClient } from "telegram";
import { Api } from "telegram";
import * as readline from "node:readline";
import fs from "fs";
import UserDBController from "./DBControllers/UserDBController";
import GiftDBController from "./DBControllers/GiftDBController";
import sequelize from "./db";
import LotteryDBController from "./DBControllers/LotteryDBController";
import ParticipationDBContoller from "./DBControllers/ParticipationDBController";
import { ELanguageCode, ELotteryStatus, ETgSubscription } from "./helpers/Enums";
import XGiftController from "./API/XGiftAPI";
import TelegramBotService from "./services/TelegramBotService";

const apiId = +(process.env.TELEGRAM_APP_ID ?? "0");
const apiHash = process.env.TELEGRAM_APP_HASH ?? "";
const session = "test_session";

const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
    return new Promise((resolve) => rl.question(query, (answer) => resolve(answer)));
}

const testClient = async () => {
    await client.start({
        phoneNumber: async () => await askQuestion("Введите номер телефона: "),
        password: async () => await askQuestion("Введите 2FA пароль: "),
        phoneCode: async () => await askQuestion("Введите код из Telegram: "),
        onError: (err) => console.log(err),
    });
    client.session.save();
    rl.close();

    const giftMessages = [];
    for await (const message of client.iterMessages("giftrelayer", { limit: 1000, minId: 722100 })) {
        console.log("Message:", message);
        const action = (message as Api.Message).action;
        if (action instanceof Api.MessageActionStarGiftUnique) {
            giftMessages.push({
                fromId: (message as Api.Message).fromId,
                gift: action.gift,
                date: (message as Api.Message).date,
            });
        }
    }

    // console.log(JSON.stringify(giftMessages, null, 4));
    // fs.writeFileSync("gifts.json", JSON.stringify(giftMessages, null, 4));
    // console.log("🎁 Доступные подарки:");
    // for (const gift of result.gifts) {
    //     console.log(`• ID: ${gift.id}, Звёзд: ${gift.stars}, Цена: ${gift.amount / 100} ${gift.currency}`);
    // }

    // const dialogs = await client.getDialogs({ limit: 100 });
    // console.log("Dialogs:", dialogs);
    // fs.writeFileSync(
    //     "dialogs.json",
    //     JSON.stringify(
    //         dialogs.map((d) => d.title),
    //         null,
    //         4
    //     )
    // );
};

const testDB = async () => {
    // Connect to DB
    await sequelize.authenticate();
    await sequelize.sync();

    // -------------- User tests --------------
    // const result = await UserDBController.create("408622472", "arseniisem");
    const dbUser = await UserDBController.getByTGId("408622472", true);
    if (!dbUser) {
        console.error("User not found");
        return;
    }
    // console.log(dbUser.toJSON());
    // const result = await UserDBController.updateBalances(dbUser, 0.1, 15);
    // await dbUser.destroy();
    // const result = await UserDBController.updateParticipantsPointsBatch("9c541c7a-aa4d-49c5-891d-b6220905d910", 10);
    const result = await UserDBController.getTopUsersByParticipations(90);

    // // -------------- Gift tests --------------
    // const result = await GiftDBController.create(dbUser.id, "408622472", 123123, "LolPop-390817", 100, 10);
    // const result = await GiftDBController.get("2b90af26-8704-450b-8f5a-ebb054af58c6");
    // const result = await GiftDBController.delete("2b90af26-8704-450b-8f5a-ebb054af58c6");

    // -------------- Lottery tests --------------
    // const result = await LotteryDBController.create();
    // if (!result) {
    //     console.error("Lottery creation failed");
    //     return;
    // }
    // const participation1 = await ParticipationDBContoller.create(
    //     dbUser.id,
    //     "5fbaa607-902c-4316-992b-77fc37954a3d",
    //     dbUser.gifts[0].id,
    //     dbUser.gifts[0].ticketsPrice,
    //     false
    // );
    // dbUser.gifts[0].isUsed = true;
    // await dbUser.gifts[0].save();
    // const participation2 = await ParticipationDBContoller.create(
    //     dbUser.id,
    //     result.id,
    //     dbUser.gifts[1].id,
    //     dbUser.gifts[1].ticketsPrice,
    //     false
    // );

    // const result = (await LotteryDBController.get("bd096068-551c-42cf-a058-cda3e3619437", true))?.toJSON();
    // if (!result) {
    //     console.error("Lottery not found");
    //     return;
    // }
    // result.winnerId = dbUser.id;
    // result.status = ELotteryStatus.FINISHED;
    // result.isClaimed = true;
    // await result.save();

    console.log("Result:", result);
};

const otherTests = () => {
    const initData =
        "user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Vladislav%20%2B%20-%20%3F%20%5C%2F%22%2C%22last_name%22%3A%22Kibenko%22%2C%22username%22%3A%22vdkfrost%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F4FPEE4tmP3ATHa57u6MqTDih13LTOiMoKoLDRG4PnSA.svg%22%7D&chat_instance=8134722200314281151&chat_type=private&auth_date=1733584787&hash=2174df5b000556d044f3f020384e879c8efcab55ddea2ced4eb752e93e7080d6&signature=zL-ucjNyREiHDE8aihFwpfR9aggP2xiAo3NSpfe-p7IbCisNlDKlo7Kb6G4D0Ao2mBrSgEk4maLSdv6MLIlADQ";
    const params = new URLSearchParams(initData);
    const initUser = params.get("user");
    const initUserParsed = JSON.parse(initUser!);
    console.log("initUserParsed:", initUserParsed);
};

const apiTest = async () => {
    // const result = await XGiftController.calculateGiftTickets("LolPop-390817");
    // console.log("Gift tickets:", result);

    const result = await TelegramBotService.isUserSubscribed("858994313", ETgSubscription.CHAT, ELanguageCode.EN);
    console.log("Is user subscribed:", result);
};

// testClient();
testDB();
// otherTests();
// apiTest();
