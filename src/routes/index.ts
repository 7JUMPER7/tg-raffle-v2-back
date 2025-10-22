import express from "express";
import AuthRouter from "./AuthRouter";
import UserRouter from "./UserRouter";
import LotteryRouter from "./LotteryRouter";
import GiftRouter from "./GiftRouter";
import DepositRouter from "./DepositRouter";

const router = express.Router();

router.use("/auth", AuthRouter);
router.use("/user", UserRouter);
router.use("/lottery", LotteryRouter);
router.use("/gift", GiftRouter);
router.use("/ton", DepositRouter);

export default router;
