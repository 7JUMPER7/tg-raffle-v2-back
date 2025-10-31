import { IncomingMessage, Server } from "http";
import WebSocket, { Server as WebSocketServer } from "ws";
import { parse as parseUrl } from "url";
import { EWebSocketMessage } from "../helpers/WSTypes";
import LotteryDBController from "../DBControllers/LotteryDBController";
import { TWebSocketMessage } from "../helpers/WSTypes";
import { TLotteryParsed } from "../helpers/Types";

class LotteryWebSocketService {
    private wss: WebSocketServer | null;
    private lotteries: Map<string, Set<WebSocket>>;
    private pingInterval: NodeJS.Timeout | null;

    // Augment WebSocket with a lightweight heartbeat flag
    private static markAlive = (ws: WebSocket & { isAlive?: boolean }) => {
        ws.isAlive = true;
    };

    constructor() {
        this.wss = null;
        this.lotteries = new Map();
        this.pingInterval = null;
    }

    startWebSocket = (server: Server) => {
        this.wss = new WebSocketServer({ server });

        // Connect handler
        this.wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
            // Heartbeat: mark connection alive and refresh on pong
            (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
            ws.on("pong", () => LotteryWebSocketService.markAlive(ws as WebSocket & { isAlive?: boolean }));

            const url = parseUrl(req.url || "", true);
            let lotteryId = url.query.lotteryId as string;
            if (!lotteryId) {
                ws.close(1008, "Lottery ID is required");
                return;
            }

            // Create lottery if not exists
            let lottery = this.lotteries.get(lotteryId);
            if (!lottery) {
                lottery = new Set<WebSocket>();
                this.lotteries.set(lotteryId, lottery);
            }
            lottery.add(ws);

            const dbLotteryParsed = await LotteryDBController.getParsed(lotteryId);
            if (!dbLotteryParsed) {
                ws.close(1008, "Lottery not found");
                return;
            }
            const wsMessage: TWebSocketMessage<TLotteryParsed> = {
                type: EWebSocketMessage.LOTTERY_INFO,
                data: dbLotteryParsed,
            };
            ws.send(JSON.stringify(wsMessage));

            // Close handler
            ws.on("close", () => {
                const lottery = this.lotteries.get(lotteryId);
                if (!lottery) return;
                lottery.delete(ws);
                if (lottery.size === 0) {
                    this.lotteries.delete(lotteryId);
                }
            });
        });

        // Set up a single ping interval for all clients to keep connections alive
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
            if (!this.wss) return;
            this.wss.clients.forEach((client) => {
                const c = client as WebSocket & { isAlive?: boolean };
                if (c.readyState !== WebSocket.OPEN) return;

                // If the client didn't respond to the previous ping, terminate
                if (c.isAlive === false) {
                    try {
                        c.terminate();
                    } catch {}
                    return;
                }

                // Prepare for the next cycle and send a ping frame
                c.isAlive = false;
                try {
                    c.ping();
                } catch {}
            });
        }, 20_000);

        // Clear interval when server closes
        this.wss.on("close", () => {
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
        });
    };

    broadcastMessage = (lotteryId: string, message: TWebSocketMessage<any>) => {
        const lottery = this.lotteries.get(lotteryId);
        if (this.wss && lottery) {
            lottery.forEach((client) => {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
        }
    };
}

export default new LotteryWebSocketService();
