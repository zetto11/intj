import express from "express";
import { getSystemStatus, getAccessPoints, getUsers } from "../controllers/systemController";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/status", authenticateToken, getSystemStatus);
router.get("/access-points", authenticateToken, getAccessPoints);
router.get("/users", authenticateToken, isAdmin, getUsers);

export default router;
