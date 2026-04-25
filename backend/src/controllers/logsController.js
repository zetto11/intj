import { query } from '../config/db.js';

export async function getLogs(req, res, next) {
  try {
    const logs = await query(
      `SELECT al.id, al.user_id, al.camera_id, al.action, al.timestamp, u.username, c.name AS camera_name
       FROM access_logs al
       LEFT JOIN users u ON u.id = al.user_id
       LEFT JOIN cameras c ON c.id = al.camera_id
       ORDER BY al.timestamp DESC
       LIMIT 200`,
    );

    res.json(logs);
  } catch (error) {
    next(error);
  }
}

export async function createLog(req, res, next) {
  try {
    const { user_id, camera_id, action } = req.body;
    const result = await query(
      'INSERT INTO access_logs (user_id, camera_id, action, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [user_id, camera_id, action],
    );

    res.status(201).json({ id: result.insertId, user_id, camera_id, action });
  } catch (error) {
    next(error);
  }
}
