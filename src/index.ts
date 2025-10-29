import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import cors from "cors";
import router from "./routes/index";
import errorHandler from "./middleware/errorHandlingMiddleware";
import sequelize from "./db";
import LotteryAutocancelService from "./services/LotteryAutocancelService";
import TelegramService from "./services/TelegramService";
import LotteryWebSocketService from "./services/LotteryWebSocketService";
import TelegramBotService from "./services/TelegramBotService";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", router);
app.use(errorHandler);

const PORT = process.env.PORT ?? 8000;

const start = async () => {
    try {
        // Connect to DB
        await sequelize.authenticate();
        await sequelize.sync();

        // // Start message listening
        // await TelegramService.checkForSkippedGifts();
        // TelegramService.listenGiftMessages();

        // // Start telegram bot
        // TelegramBotService.start();

        // Start lottery autocancel service
        LotteryAutocancelService.startLoop();

        // HTTP
        const server = http.createServer(app);
        LotteryWebSocketService.startWebSocket(server);

        server.listen(PORT, () => {
            console.log("Server started on port: " + PORT);
        });
    } catch (e: any) {
        console.error("Start up error:", e.message);
    }
};

start();
