import jwt from "jsonwebtoken";
import { JwtUserPayload } from "../helpers/Interfaces";

if (!process.env.JWT_ACCESS_SECRET) {
    console.error("JWT_ACCESS_SECRET not set");
    process.exit(1);
}

class JWTService {
    generateToken(payload: JwtUserPayload) {
        const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: "1h" });
        return "Bearer " + token;
    }

    verifyToken(token: string) {
        try {
            const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
            return payload;
        } catch (e: any) {
            return e.message as string;
        }
    }

    getTokenPayload(token: string) {
        const decodedToken = jwt.decode(token, { complete: true });
        if (decodedToken) {
            return decodedToken.payload as JwtUserPayload;
        }
        return null;
    }
}

export default new JWTService();
