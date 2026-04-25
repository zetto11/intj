import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "../../frontend/node_modules/jsonwebtoken/index.js";
import { db } from "../config/db";

const JWT_SECRET = process.env.JWT_SECRET || "cctv-secure-secret-2024";

export const register = async (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Missing username, password, or role" });
  }

  try {
    const [existing]: any = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const [result]: any = await db.execute(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
      [username, passwordHash, role]
    );

    res.status(201).json({ success: true, userId: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const [rows]: any = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
    const user = rows[0];

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    let isMatch = false;
    if (user.password_hash.startsWith("$2a$") || user.password_hash.startsWith("$2b$")) {
      isMatch = bcrypt.compareSync(password, user.password_hash);
    } else {
      isMatch = password === user.password_hash;
    }

    if (isMatch) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role }, 
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
