import { IncomingMessage, Server } from "http";
import WebSocket, { Server as WebSocketServer } from "ws";
import WebSocketAuthManager from "./WebSocketAuthManager";
import WebSocketConnectionManager from "./WebSocketConnectionManager";
import { TWebSocketMessage, EWebSocketMessage, IAuthenticatedWebSocket } from "../../helpers/WSTypes";
import LotteryDBController from "../../DBControllers/LotteryDBController";

class UnifiedWebsocketService {
    private wss: WebSocketServer | null;
    private pingInterval: NodeJS.Timeout | null;
    private readonly HEARTBEAT_INTERVAL = 20_000; // 20 seconds

    constructor() {
        this.wss = null;
        this.pingInterval = null;
    }

    // Start WebSocket
    startWebSocket(server: Server) {
        this.wss = new WebSocketServer({ server });

        this.wss.on("connection", this.handleConnection.bind(this));
        this.startHeartbeat();

        // Cleanup on server close
        this.wss.on("close", this.cleanup.bind(this));
    }

    // New connection handler
    private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
        const authWs = ws as IAuthenticatedWebSocket;

        // Initialize heartbeat
        authWs.isAlive = true;
        authWs.connectedAt = Date.now();

        // Authenticate connection
        const userPayload = WebSocketAuthManager.authenticateConnection(authWs, req);
        if (!userPayload) {
            this.sendError(authWs, "Authentication failed. Valid token required.");
            authWs.close(1008, "Authentication required");
            return;
        }

        // Register connection
        WebSocketConnectionManager.addConnection(authWs);

        // Send connection success message
        const activeLottery = await LotteryDBController.getActive();
        this.sendToConnection(authWs, {
            type: EWebSocketMessage.LOTTERY_INFO,
            data: activeLottery ? LotteryDBController.parseLottery(activeLottery) : null,
        });

        // Setup pong handler for heartbeat
        authWs.on("pong", () => {
            authWs.isAlive = true;
        });

        // Handle incoming messages
        authWs.on("message", (data: WebSocket.Data) => {
            this.handleMessage(authWs, data);
        });

        // Handle disconnection
        authWs.on("close", () => {
            WebSocketConnectionManager.removeConnection(authWs);
        });

        // Handle errors
        authWs.on("error", (error) => {
            console.error(`UnifiedWebsocketService handleConnection WebSocket error for user ${userPayload.userId}:`, error);
        });
    }

    // Incoming message handler
    private handleMessage(ws: IAuthenticatedWebSocket, data: WebSocket.Data) {
        try {
            const message = JSON.parse(data.toString());

            // Handle different message types here
            if (message.type === "subscribe") {
                // Subscription logic
            } else if (message.type === "unsubscribe") {
                // Unsubscription logic
            }
        } catch (error) {
            console.error(`UnifiedWebsocketService handleMessage error parsing message from user ${ws.userId}:`, error);
            this.sendError(ws, "Invalid message format");
        }
    }

    // Heartbeat
    private startHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.pingInterval = setInterval(() => {
            if (!this.wss) return;

            this.wss.clients.forEach((client) => {
                const authClient = client as IAuthenticatedWebSocket;

                if (authClient.readyState !== WebSocket.OPEN) {
                    return;
                }

                // Check if client responded to previous ping
                if (authClient.isAlive === false) {
                    try {
                        authClient.terminate();
                    } catch (error) {
                        console.error(`UnifiedWebsocketService startHeartbeat error terminating connection:`, error);
                    }
                    return;
                }

                // Mark as not alive and send ping
                authClient.isAlive = false;
                try {
                    authClient.ping();
                } catch (error) {
                    console.error(`UnifiedWebsocketService startHeartbeat error sending ping:`, error);
                }
            });
        }, this.HEARTBEAT_INTERVAL);

        console.log(`UnifiedWebsocketService heartbeat started (interval: ${this.HEARTBEAT_INTERVAL}ms)`);
    }

    // Send message to a specific connection
    private sendToConnection(ws: IAuthenticatedWebSocket, message: TWebSocketMessage<any>) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            } catch (error) {
                console.error(`UnifiedWebsocketService sendToConnection error:`, error);
            }
        }
    }

    // Send error
    private sendError(ws: IAuthenticatedWebSocket, errorMessage: string) {
        this.sendToConnection(ws, {
            type: EWebSocketMessage.ERROR,
            data: { message: errorMessage },
        });
    }

    // Send message to user (all connections)
    sendToUser(userId: string, message: TWebSocketMessage<any>) {
        const connections = WebSocketConnectionManager.getUserConnections(userId);
        connections.forEach((ws) => {
            this.sendToConnection(ws, message);
        });
    }

    // Send message to multiple users
    sendToUsers(userIds: string[], message: TWebSocketMessage<any>) {
        userIds.forEach((userId) => {
            this.sendToUser(userId, message);
        });
    }

    // Send message to all connected users
    sendToAll(message: TWebSocketMessage<any>) {
        const connections = WebSocketConnectionManager.getAllConnections();
        connections.forEach((ws) => {
            this.sendToConnection(ws, message);
        });
    }

    // Check if user is connected
    isUserConnected(userId: string): boolean {
        return WebSocketConnectionManager.isUserConnected(userId);
    }

    // Get connection statistics
    getStats(): {
        totalConnections: number;
        uniqueUsers: number;
    } {
        return WebSocketConnectionManager.getStats();
    }

    // Cleanup resources on service shutdown
    private cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        console.log("UnifiedWebsocketService WebSocket server closed");
    }

    // Stop WebSocket server
    stop() {
        if (this.wss) {
            this.wss.close(() => {
                console.log("UnifiedWebsocketService WebSocket server stopped");
            });
        }
    }
}

export default new UnifiedWebsocketService();
