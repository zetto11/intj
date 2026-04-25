import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { db } from "../config/db";

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await db.execute(`
      SELECT id, type, severity, description, camera_id, timestamp,
             NULL as explanation, NULL as affected_entity, 0 as is_acknowledged
      FROM alerts
      ORDER BY timestamp DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const acknowledgeAlert = async (req: AuthRequest, res: Response) => {
  try {
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const acknowledgeAllAlerts = async (req: AuthRequest, res: Response) => {
  try {
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
