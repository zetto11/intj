import { query } from '../config/db.js';

export async function getCameras(req, res, next) {
  try {
    const cameras = await query('SELECT * FROM cameras ORDER BY id DESC');
    res.json(cameras);
  } catch (error) {
    next(error);
  }
}

export async function createCamera(req, res, next) {
  try {
    const { name, zone, ip_simulated, status = 'online', is_blocked = false, last_seen = null } = req.body;

    const result = await query(
      `INSERT INTO cameras (name, zone, ip_simulated, status, is_blocked, last_seen)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, zone, ip_simulated, status, is_blocked ? 1 : 0, last_seen],
    );

    res.status(201).json({ id: result.insertId, name, zone, ip_simulated, status, is_blocked, last_seen });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Camera IP already exists.' });
    }
    return next(error);
  }
}

export async function updateCamera(req, res, next) {
  try {
    const { id } = req.params;
    const { status, is_blocked } = req.body;

    await query(
      `UPDATE cameras
       SET status = COALESCE(?, status),
           is_blocked = COALESCE(?, is_blocked),
           last_seen = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status ?? null, typeof is_blocked === 'boolean' ? (is_blocked ? 1 : 0) : null, id],
    );

    const updated = await query('SELECT * FROM cameras WHERE id = ?', [id]);
    if (updated.length === 0) {
      return res.status(404).json({ message: 'Camera not found.' });
    }

    return res.json(updated[0]);
  } catch (error) {
    return next(error);
  }
}
