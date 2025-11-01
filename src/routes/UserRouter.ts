import express from "express";
import UserController from "../Controllers/UserController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/info", authMiddleware, UserController.getUserInfo);
router.get("/check-subscription", authMiddleware, UserController.checkChannelSubscription);

export default router;
