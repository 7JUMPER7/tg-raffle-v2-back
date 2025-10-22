import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface JwtUserPayload extends JwtPayload {
    userId?: string;
}

export interface AuthenticatedRequest extends Request {
    userPayload?: JwtUserPayload;
}
