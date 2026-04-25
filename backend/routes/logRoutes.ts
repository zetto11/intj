import express from "express";
import { getLogs, logViewAction } from "../controllers/logController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authenticateToken, getLogs);
router.post("/view", authenticateToken, logViewAction);

export default router;
