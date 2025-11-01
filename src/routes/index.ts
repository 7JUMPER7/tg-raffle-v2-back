import express from "express";
import AuthRouter from "./AuthRouter";
import UserRouter from "./UserRouter";
import LotteryRouter from "./LotteryRouter";
import GiftRouter from "./GiftRouter";
import DepositRouter from "./DepositRouter";
import StatsRouter from "./StatsRouter";

const router = express.Router();

router.use("/auth", AuthRouter);
router.use("/user", UserRouter);
router.use("/lottery", LotteryRouter);
router.use("/gift", GiftRouter);
router.use("/ton", DepositRouter);
router.use("/stats", StatsRouter);

export default router;
