import { IAuthenticatedWebSocket } from "../../helpers/WSTypes";

class WebSocketConnectionManager {
    // Map of userId -> Set of WebSocket connections (user can have multiple tabs/devices)
    private userConnections: Map<string, Set<IAuthenticatedWebSocket>>;

    constructor() {
        this.userConnections = new Map();
    }

    // Add new WebSocket connection
    addConnection(ws: IAuthenticatedWebSocket): void {
        if (!ws.userId) {
            console.warn("[WebSocketConnectionManager] Attempted to add connection without userId");
            return;
        }

        // Add to user connections
        if (!this.userConnections.has(ws.userId)) {
            this.userConnections.set(ws.userId, new Set());
        }
        this.userConnections.get(ws.userId)!.add(ws);
    }

    // Remove WebSocket connection
    removeConnection(ws: IAuthenticatedWebSocket): void {
        // Remove from user connections
        if (ws.userId) {
            const userConns = this.userConnections.get(ws.userId);
            if (userConns) {
                userConns.delete(ws);
                if (userConns.size === 0) {
                    this.userConnections.delete(ws.userId);
                }
            }
        }
    }

    // Get user connections
    getUserConnections(userId: string): Set<IAuthenticatedWebSocket> {
        return this.userConnections.get(userId) || new Set();
    }

    // Get all connections
    getAllConnections(): IAuthenticatedWebSocket[] {
        const allConnections: IAuthenticatedWebSocket[] = [];
        this.userConnections.forEach((connections) => {
            connections.forEach((ws) => allConnections.push(ws));
        });
        return allConnections;
    }

    // Check if user is connected
    isUserConnected(userId: string): boolean {
        const connections = this.userConnections.get(userId);
        return connections ? connections.size > 0 : false;
    }

    // Get total WS connections
    getConnectionCount(): number {
        let count = 0;
        this.userConnections.forEach((connections) => {
            count += connections.size;
        });
        return count;
    }

    // Get total unique users connected
    getUserCount(): number {
        return this.userConnections.size;
    }

    // Get stats
    getStats(): {
        totalConnections: number;
        uniqueUsers: number;
    } {
        return {
            totalConnections: this.getConnectionCount(),
            uniqueUsers: this.getUserCount(),
        };
    }
}

export default new WebSocketConnectionManager();
