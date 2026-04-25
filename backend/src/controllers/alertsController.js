import { query } from '../config/db.js';

export async function getAlerts(req, res, next) {
  try {
    const alerts = await query('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 200');
    res.json(alerts);
  } catch (error) {
    next(error);
  }
}

export async function createAlert(req, res, next) {
  try {
    const { type, severity, description } = req.body;
    const result = await query(
      'INSERT INTO alerts (type, severity, description, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [type, severity, description],
    );

    res.status(201).json({ id: result.insertId, type, severity, description });
  } catch (error) {
    next(error);
  }
}
