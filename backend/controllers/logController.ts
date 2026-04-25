import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { db } from "../config/db";

export const getLogs = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await db.execute(`
      SELECT al.*, u.username, c.name as camera_name 
      FROM access_logs al 
      JOIN users u ON al.user_id = u.id 
      LEFT JOIN cameras c ON al.camera_id = c.id 
      ORDER BY timestamp DESC LIMIT 100
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const logViewAction = async (req: AuthRequest, res: Response) => {
  const { camera_id } = req.body;
  try {
    await db.execute(
      "INSERT INTO access_logs (user_id, camera_id, action) VALUES (?, ?, ?)",
      [req.user?.id, camera_id, "view"]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
