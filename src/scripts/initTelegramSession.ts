import dotenv from "dotenv";
dotenv.config();
import { TelegramClient } from "telegram";
import * as readline from "node:readline";
import { StringSession } from "telegram/sessions";

const apiId = +(process.env.TELEGRAM_APP_ID ?? "0");
const apiHash = process.env.TELEGRAM_APP_HASH ?? "";
const session = "";

const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, (answer) => resolve(answer)));
};

const main = async () => {
    await client.start({
        phoneNumber: async () => await askQuestion("Enter phone number: "),
        password: async () => await askQuestion("Enter telegram password: "),
        phoneCode: async () => await askQuestion("Enter code from telegram: "),
        onError: (err) => console.log(err),
    });

    const newSessionString = (client.session as StringSession).save();
    console.log("New session string:", newSessionString);

    client.session.save();
    rl.close();
};

main();
