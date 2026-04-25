import express from "express";
import { createServer } from "http";
import { Server } from "../frontend/node_modules/socket.io/dist/index.js";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { connectToDatabase, db } from "./config/db";
import { authenticateToken, isAdmin } from "./middleware/authMiddleware";
import authRoutes from "./routes/authRoutes";
import createCameraRouter from "./routes/cameraRoutes";
import alertRoutes from "./routes/alertRoutes";
import logRoutes from "./routes/logRoutes";
import systemRoutes from "./routes/systemRoutes";
import { getSystemStatus, getAccessPoints, getUsers } from "./controllers/systemController";
import { startAiVisionSimulation } from "./services/aiVisionService";

dotenv.config();

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number, decimals = 2) =>
  Number((Math.random() * (max - min) + min).toFixed(decimals));
const formatHHMMSS = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

async function startServer() {
  const isDbConnected = await connectToDatabase().catch((err) => {
    console.error("Database connection failed during startup:", err.message);
    return false;
  });

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(cors());
  app.use(express.json());
  app.use("/cam_screens", express.static(path.resolve(process.cwd(), "cam_screens")));

  app.use((req, _res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (_req, res) => res.json({
    status: "alive",
    dbConnected: isDbConnected
  }));

  app.use("/api/auth", authRoutes);
  app.use("/api/cameras", createCameraRouter(io));
  app.use("/api/alerts", alertRoutes);
  app.use("/api/logs", logRoutes);
  app.use("/api/system", systemRoutes);

  app.use("/api", authRoutes);
  app.get("/api/system-status", authenticateToken, getSystemStatus);
  app.get("/api/access-points", authenticateToken, getAccessPoints);
  app.get("/api/users", authenticateToken, isAdmin, getUsers);

  setInterval(async () => {
    try {
      const [cameras]: any = await db.execute("SELECT id, status FROM cameras");
      for (const cam of cameras) {
        if (Math.random() < 0.05) {
          const newStatus = cam.status === "online" ? "offline" : "online";
          await db.execute("UPDATE cameras SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [newStatus, cam.id]);
          io.emit("camera_update", { id: cam.id, status: newStatus });

          if (newStatus === "offline") {
            const [result]: any = await db.execute(
              "INSERT INTO alerts (type, severity, description, camera_id) VALUES (?, ?, ?, ?)",
              ["system", "high", `Security node CAM-${cam.id} lost connectivity`, cam.id]
            );

            io.emit("new_alert", {
              id: result.insertId,
              type: "system",
              severity: "high",
              description: `Security node CAM-${cam.id} lost connectivity`,
              timestamp: new Date().toISOString(),
              is_acknowledged: false
            });
          }
        }
      }
    } catch (_e) {
      // keep simulation fault-tolerant
    }
  }, 5000);

  const telemetryState: Record<number, {
    uptimeSeconds: number;
    signal: number;
    thermal: number;
    load: number;
    storageGb: number;
    retainDays: number;
    lastTickMs: number;
    status: "online" | "offline" | "blocked";
    lastResumeMs: number;
    paused: boolean;
    lastRetentionAlertAt: number;
  }> = {};

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const runTelemetryCycle = async () => {
    try {
      const [rows]: any = await db.execute(
        `SELECT c.id, c.zone, c.status, c.is_blocked, ct.uptime_seconds, ct.uptime_hours, ct.signal_percent, ct.thermal_celsius, ct.load_percent,
                ct.retain_days_remaining, ct.storage_used_tb, ct.storage_node_label
         FROM cameras c
         LEFT JOIN camera_telemetry ct ON ct.camera_id = c.id`
      );

      for (const cam of rows) {
        if (!telemetryState[cam.id]) {
          telemetryState[cam.id] = {
            uptimeSeconds: Math.max(0, Number(cam.uptime_seconds ?? (Number(cam.uptime_hours ?? 0) * 3600))),
            signal: clamp(Number(cam.signal_percent ?? randInt(60, 100)), 0, 100),
            thermal: clamp(Number(cam.thermal_celsius ?? randFloat(35, 65, 2)), 30, 90),
            load: clamp(Number(cam.load_percent ?? randInt(10, 80)), 0, 100),
            storageGb: Math.max(0.5, Number(cam.storage_used_tb ?? 0.0005) * 1024),
            retainDays: Math.max(0, Number(cam.retain_days_remaining ?? randInt(7, 30))),
            lastTickMs: Date.now(),
            status: cam.is_blocked ? "blocked" : (String(cam.status || "offline") === "online" ? "online" : "offline"),
            lastResumeMs: Date.now(),
            paused: !(String(cam.status || "offline") === "online") || !!cam.is_blocked,
            lastRetentionAlertAt: 0,
          };
        }

        const state = telemetryState[cam.id];
        const nowMs = Date.now();
        const elapsedSec = Math.max(1, (nowMs - state.lastTickMs) / 1000);
        state.lastTickMs = nowMs;

        const zoneKey = String(cam.zone || "").toLowerCase();
        const zoneThermalBias = zoneKey === "factory" ? 12 : zoneKey === "warehouse" ? 6 : 2;
        const currentStatus: "online" | "offline" | "blocked" = cam.is_blocked
          ? "blocked"
          : (String(cam.status || "offline") === "online" ? "online" : "offline");

        if (state.status !== currentStatus) {
          if (currentStatus === "online") {
            state.signal = randInt(60, 85);
            state.load = randInt(10, 30);
            state.thermal = randFloat(35, 45, 2);
            state.paused = false;
            state.lastResumeMs = nowMs;
          } else {
            state.paused = true;
            state.lastResumeMs = 0;
          }
          state.status = currentStatus;
        }

        if (!state.paused && currentStatus === "online") {
          state.uptimeSeconds += elapsedSec;
          state.signal = clamp(state.signal + randInt(-5, 5), 0, 100);
          const activitySpike = Math.random() > 0.85 ? randInt(8, 20) : 0;
          state.load = clamp(state.load + randInt(-10, 10) + activitySpike, 0, 100);

          const targetThermal = clamp(30 + zoneThermalBias + state.load * 0.45, 30, 90);
          const thermalDelta = clamp(targetThermal - state.thermal, -1.5, 1.5);
          state.thermal = clamp(state.thermal + thermalDelta + randFloat(-0.3, 0.3, 2), 30, 90);

          state.storageGb = Math.min(20, state.storageGb + (elapsedSec * 0.0015) + (state.load * 0.0002));
          state.retainDays = Math.max(0, state.retainDays - (elapsedSec / 86400));
        }

        const uptimeHours = Number((state.uptimeSeconds / 3600).toFixed(3));
        const storageTb = Number((state.storageGb / 1024).toFixed(4));
        const retainDays = Math.max(0, Number(state.retainDays.toFixed(3)));
        const uptimeHHMMSS = formatHHMMSS(state.uptimeSeconds);

        await db.execute(
          `INSERT INTO camera_telemetry
          (camera_id, signal_percent, uptime_seconds, uptime_hours, thermal_celsius, load_percent, retain_days_remaining, storage_used_tb, storage_node_label)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            signal_percent = VALUES(signal_percent),
            uptime_seconds = VALUES(uptime_seconds),
            uptime_hours = VALUES(uptime_hours),
            thermal_celsius = VALUES(thermal_celsius),
            load_percent = VALUES(load_percent),
            retain_days_remaining = VALUES(retain_days_remaining),
            storage_used_tb = VALUES(storage_used_tb),
            storage_node_label = VALUES(storage_node_label),
            updated_at = CURRENT_TIMESTAMP`,
          [
            cam.id,
            Math.round(state.signal),
            Math.floor(state.uptimeSeconds),
            uptimeHours,
            Number(state.thermal.toFixed(2)),
            Math.round(state.load),
            Math.floor(retainDays),
            storageTb,
            cam.storage_node_label || `Sigma-${randInt(1, 9)}`,
          ]
        );

        if (retainDays < 5 && (Date.now() - state.lastRetentionAlertAt > 6 * 60 * 60 * 1000)) {
          state.lastRetentionAlertAt = Date.now();
          const [result]: any = await db.execute(
            "INSERT INTO alerts (type, severity, description, camera_id) VALUES (?, ?, ?, ?)",
            ["system", "medium", `Camera ${cam.id} retention low: ${retainDays.toFixed(2)} days remaining`, cam.id]
          );
          io.emit("new_alert", {
            id: result.insertId,
            type: "system",
            severity: "medium",
            description: `Camera ${cam.id} retention low: ${retainDays.toFixed(2)} days remaining`,
            timestamp: new Date().toISOString(),
            is_acknowledged: false
          });
        }

        io.emit("camera_telemetry_update", {
          camera_id: cam.id,
          signal_percent: Math.round(state.signal),
          uptime_seconds: Math.floor(state.uptimeSeconds),
          uptime_hhmmss: uptimeHHMMSS,
          uptime_hours: uptimeHours,
          thermal_celsius: Number(state.thermal.toFixed(2)),
          load_percent: Math.round(state.load),
          storage_used_tb: storageTb,
          retain_days_remaining: retainDays,
          status: currentStatus,
        });
      }
    } catch {
      // keep telemetry simulation fault-tolerant
    } finally {
      const nextMs = randInt(1000, 5000);
      setTimeout(runTelemetryCycle, nextMs);
    }
  };

  setTimeout(runTelemetryCycle, randInt(1000, 5000));
  startAiVisionSimulation(io);

  const PORT = Number(process.env.PORT || 3000);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n--- SOC BACKEND API ONLINE ---`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Database: ${isDbConnected ? "CONNECTED" : "DISCONNECTED"}`);
    console.log(`-------------------------------\n`);
  });
}

startServer();