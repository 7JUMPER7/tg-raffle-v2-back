import express from "express";
import DepositController from "../Controllers/DepositController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/address", authMiddleware, DepositController.getDepositAddress);
router.post("/withdraw", authMiddleware, DepositController.withdrawTon);

export default router;
