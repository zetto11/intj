import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { db } from "../config/db";

export const getSystemStatus = async (req: AuthRequest, res: Response) => {
  try {
    const [camerasRows]: any = await db.execute("SELECT * FROM cameras");
    const [alertsRows]: any = await db.execute(`
      SELECT id, type, severity, description, camera_id, timestamp,
             NULL as explanation, NULL as affected_entity, 0 as is_acknowledged
      FROM alerts
      ORDER BY timestamp DESC
      LIMIT 20
    `);
    const [logsRows]: any = await db.execute(`
      SELECT al.*, u.username, c.name as camera_name
      FROM access_logs al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN cameras c ON al.camera_id = c.id
      ORDER BY timestamp DESC LIMIT 20
    `);

    const cameras = camerasRows;
    const alerts = alertsRows;
    const logs = logsRows;

    const stats = {
      totalCameras: cameras.length,
      onlineCameras: cameras.filter((c: any) => c.status === "online").length,
      unacknowledgedAlerts: alerts.length,
      highSeverityAlerts: alerts.filter((a: any) => a.severity === "high" || a.severity === "critical").length
    };

    res.json({ cameras, alerts, logs, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAccessPoints = async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await db.execute(`
      SELECT id,
             name,
             CASE WHEN status = 'offline' THEN 'offline' ELSE 'online' END as status,
             NULL as lat,
             NULL as lng
      FROM cameras
      ORDER BY id ASC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await db.execute("SELECT id, username, role FROM users");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
