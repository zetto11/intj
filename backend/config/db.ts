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
    CREATE TABLE IF NOT EXISTS camera_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camera_id INTEGER NOT NULL UNIQUE,
      signal_percent INTEGER DEFAULT 0,
      uptime_seconds INTEGER DEFAULT 0,
      uptime_hours REAL DEFAULT 0,
      thermal_celsius REAL DEFAULT 0,
      load_percent INTEGER DEFAULT 0,
      retain_days_remaining INTEGER DEFAULT 0,
      storage_used_tb REAL DEFAULT 0,
      storage_node_label TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      ["Cam_Gate_Main", "Gate", "http://192.168.1.101:8080/video", "online", 0],
      ["Cam_Gate_Post", "Gate", "http://192.168.1.102:8080/video", "online", 0],
      ["Cam_Factory_Line1", "Factory", "http://192.168.2.55:8080/video", "online", 0],
      ["Cam_Factory_Line2", "Factory", "http://192.168.2.56:8080/video", "offline", 0],
      ["Cam_Warehouse_Loading", "Warehouse", "http://192.168.3.10:8080/video", "online", 0],
      ["Cam_Office_ServerRoom", "Office", "http://192.168.4.21:8080/video", "online", 1],
    ];
    const insertCam = sqliteDb.prepare(
      "INSERT INTO cameras (name, zone, ip_simulated, status, is_blocked) VALUES (?, ?, ?, ?, ?)"
    );
    const insertTelemetry = sqliteDb.prepare(
      `INSERT INTO camera_telemetry
      (camera_id, signal_percent, uptime_seconds, uptime_hours, thermal_celsius, load_percent, retain_days_remaining, storage_used_tb, storage_node_label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    cameras.forEach((cam: any[], idx: number) => {
      const result = insertCam.run(...cam);
      insertTelemetry.run(
        Number(result.lastInsertRowid),
        75 + (idx % 10),
        0,
        0,
        36 + idx,
        20 + idx,
        30 - idx,
        0.001 + (idx * 0.0002),
        `Sigma-${idx + 1}`
      );
    });
  }

  sqliteDb.exec(`
    INSERT OR IGNORE INTO camera_telemetry
    (camera_id, signal_percent, uptime_seconds, uptime_hours, thermal_celsius, load_percent, retain_days_remaining, storage_used_tb, storage_node_label)
    SELECT c.id, 78, 0, 0, 38.5, 25, 30, 0.001, 'Sigma-1'
    FROM cameras c
    WHERE c.id NOT IN (SELECT camera_id FROM camera_telemetry)
  `);
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
