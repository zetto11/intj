import mysql from "mysql2/promise";
import Database from "../../frontend/node_modules/better-sqlite3/lib/index.js";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "cctv_cam_db",
  port: parseInt(process.env.DB_PORT || "3306"),
};

export let pool: any = null;
let sqliteDb: any = null;
let isUsingSqlite = false;

export async function connectToDatabase() {
  try {
    console.log(`[DB] Attempting MySQL connection: ${dbConfig.host}:${dbConfig.port}...`);
    pool = mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 5 });
    const connection = await pool.getConnection();
    console.log("[DB] MySQL connection established.");
    connection.release();
    return true;
  } catch (err: any) {
    console.warn(`[DB] MySQL Failed (${err.code}). Activating SQLite Fallback...`);
    isUsingSqlite = true;
    setupSqlite();
    return true;
  }
}

function setupSqlite() {
  sqliteDb = new Database("cctv_fallback.db");

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      zone TEXT NOT NULL,
      ip_simulated TEXT NOT NULL,
      status TEXT DEFAULT 'online',
      is_blocked INTEGER DEFAULT 0,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      camera_id INTEGER,
      action TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      camera_id INTEGER,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id INTEGER,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const user = sqliteDb.prepare("SELECT * FROM users WHERE username = ?").get("admin");
  if (!user) {
    const insertUser = sqliteDb.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
    insertUser.run("admin", "admin123", "admin");
    insertUser.run("operator", "operator123", "operator");
    insertUser.run("viewer", "viewer123", "viewer");
  }

  const cameraCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM cameras").get().count;
  if (cameraCount === 0) {
    const cameras = [
      ["Cam_Gate_Main", "Gate", "192.168.1.101", "online", 0],
      ["Cam_Gate_Post", "Gate", "192.168.1.102", "online", 0],
      ["Cam_Factory_Line1", "Factory", "192.168.2.55", "online", 0],
      ["Cam_Factory_Line2", "Factory", "192.168.2.56", "offline", 0],
      ["Cam_Warehouse_Loading", "Warehouse", "192.168.3.10", "online", 0],
      ["Cam_Office_ServerRoom", "Office", "192.168.4.21", "online", 1],
    ];
    const insertCam = sqliteDb.prepare(
      "INSERT INTO cameras (name, zone, ip_simulated, status, is_blocked) VALUES (?, ?, ?, ?, ?)"
    );
    cameras.forEach((cam: any[]) => insertCam.run(...cam));
  }
}

export const db = {
  execute: async (query: string, params: any[] = []) => {
    if (isUsingSqlite) {
      const stmt = sqliteDb.prepare(query.replace(/CURRENT_TIMESTAMP/g, "datetime('now')"));
      if (query.toUpperCase().startsWith("SELECT")) {
        return [stmt.all(...params)];
      }
      const result = stmt.run(...params);
      return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
    }
    return await pool.execute(query, params);
  }
};
