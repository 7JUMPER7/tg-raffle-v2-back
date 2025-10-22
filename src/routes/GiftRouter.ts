import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import GiftController from "../Controllers/GiftController";

const router = express.Router();

router.post("/withdraw/:giftId", authMiddleware, GiftController.withdrawGift);

export default router;
