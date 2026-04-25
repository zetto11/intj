import express from "express";
import { getAlerts, acknowledgeAlert, acknowledgeAllAlerts } from "../controllers/alertController";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authenticateToken, getAlerts);
router.post("/:id/acknowledge", authenticateToken, acknowledgeAlert);
router.post("/acknowledge-all", authenticateToken, isAdmin, acknowledgeAllAlerts);

export default router;
