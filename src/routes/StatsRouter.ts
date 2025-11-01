import express from "express";
import StatsController from "../Controllers/StatsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/latest", authMiddleware, StatsController.getLatestParticipations);

export default router;
