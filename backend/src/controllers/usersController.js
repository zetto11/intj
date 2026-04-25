import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

export async function getUsers(req, res, next) {
  try {
    const users = await query('SELECT id, username, role FROM users ORDER BY id DESC');
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { username, password, role = 'viewer' } = req.body;
    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, password_hash, role],
    );

    res.status(201).json({ id: result.insertId, username, role });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    return next(error);
  }
}
