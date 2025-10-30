import express from "express";
import LotteryController from "../Controllers/LotteryController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/participate", authMiddleware, LotteryController.participateRequest);
router.post("/check-win", authMiddleware, LotteryController.checkWinRequest);

export default router;
