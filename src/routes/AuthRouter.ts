import express from "express";
import AuthController from "../Controllers/AuthController";
import { tgAuthMiddleware } from "../middleware/tgAuthMiddleware";

const router = express.Router();

router.post("/", tgAuthMiddleware, AuthController.authenticate);
router.post("/register", tgAuthMiddleware, AuthController.register);

export default router;
