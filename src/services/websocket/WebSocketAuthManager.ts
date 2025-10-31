import { IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import JWTService from "../JWTService";
import { JwtUserPayload } from "../../helpers/Interfaces";
import { IAuthenticatedWebSocket } from "../../helpers/WSTypes";

class WebSocketAuthManager {
    // Authenticate WebSocket connection using JWT token
    authenticateConnection(ws: IAuthenticatedWebSocket, req: IncomingMessage): JwtUserPayload | null {
        const token = this.extractToken(req);
        if (!token) {
            return null;
        }

        // If verification failed, userData will be a string (error message)
        const userData = JWTService.verifyToken(token);
        if (typeof userData === "string") {
            return null;
        }

        // Ensure userId exists in payload
        const userPayload = userData as JwtUserPayload;
        if (!userPayload.userId) {
            return null;
        }

        // Attach authentication data to WebSocket
        ws.userPayload = userPayload;
        ws.userId = userPayload.userId;

        return userPayload;
    }

    // Extract JWT token from request
    private extractToken(req: IncomingMessage): string | null {
        const url = parseUrl(req.url || "", true);
        const queryToken = url.query.token as string;
        if (queryToken) {
            const parts = queryToken.split(" ");
            if (parts.length === 2 && parts[0] === "Bearer") {
                return parts[1];
            }
        }
        return null;
    }

    // Is authenticated check
    isAuthenticated(ws: IAuthenticatedWebSocket): boolean {
        return !!(ws.userPayload && ws.userId);
    }
}

export default new WebSocketAuthManager();
