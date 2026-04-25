import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { db } from "../config/db";
import { Server } from "socket.io";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number, decimals = 2) =>
  Number((Math.random() * (max - min) + min).toFixed(decimals));

const generateTelemetryByZone = (zone: string) => {
  const zoneKey = String(zone || "").toLowerCase();
  const signalRange = zoneKey === "factory" ? [60, 88] : zoneKey === "warehouse" ? [65, 92] : [72, 100];
  const thermalRange = zoneKey === "factory" ? [50, 80] : [35, 65];
  const storageGb = randFloat(0.5, 20, 2);
  return {
    signal_percent: randInt(signalRange[0], signalRange[1]),
    uptime_hours: 0,
    thermal_celsius: randFloat(thermalRange[0], thermalRange[1], 2),
    load_percent: randInt(10, 90),
    retain_days_remaining: randInt(7, 30),
    storage_used_tb: Number((storageGb / 1024).toFixed(4)),
    storage_node_label: `Sigma-${randInt(1, 9)}`,
  };
};

const normalizeStreamUrl = (url: string, forceVideo = false) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (!forceVideo) return trimmed;
  if (/\/video\/?$/i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  if (/^https?:\/\/[^/]+$/i.test(trimmed)) return `${trimmed}/video`;
  return trimmed;
};

export const getCameras = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
        c.id,
        c.name,
        c.zone,
        c.ip_simulated,
        c.status,
        c.is_blocked,
        c.last_seen,
        ct.signal_percent,
        ct.uptime_seconds,
        ct.uptime_hours,
        ct.thermal_celsius,
        ct.load_percent,
        ct.retain_days_remaining,
        ct.storage_used_tb,
        ct.storage_node_label,
        ct.updated_at AS telemetry_updated_at
      FROM cameras c
      LEFT JOIN camera_telemetry ct ON ct.camera_id = c.id
      ORDER BY c.id DESC`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createCamera = async (req: AuthRequest, res: Response) => {
  const { name, ip_simulated, zone } = req.body || {};
  if (!name || !ip_simulated || !zone) {
    return res.status(400).json({ error: "name, ip_simulated and zone are required" });
  }
  if (!String(ip_simulated).toLowerCase().startsWith("http")) {
    return res.status(400).json({ error: "ip_simulated must start with http" });
  }

  const normalizedZone = String(zone).trim().toLowerCase();
  const zoneMap: Record<string, "Gate" | "Factory" | "Warehouse" | "Office"> = {
    gate: "Gate",
    factory: "Factory",
    warehouse: "Warehouse",
    office: "Office",
    "auto-detected": "Gate",
  };
  if (!zoneMap[normalizedZone]) {
    return res.status(400).json({ error: "zone must be one of: Gate, Factory, Warehouse, Office" });
  }

  try {
    const [existsRows]: any = await db.execute(
      "SELECT id FROM cameras WHERE name = ? OR ip_simulated = ? LIMIT 1",
      [name, ip_simulated]
    );
    if (existsRows.length) {
      return res.status(409).json({ error: "Camera name or IP/URL already exists" });
    }

    const [result]: any = await db.execute(
      "INSERT INTO cameras (name, ip_simulated, zone, status, is_blocked) VALUES (?, ?, ?, 'online', false)",
      [name, ip_simulated, zoneMap[normalizedZone]]
    );

    const telemetry = generateTelemetryByZone(zoneMap[normalizedZone]);
    await db.execute(
      `INSERT INTO camera_telemetry
      (camera_id, signal_percent, uptime_seconds, uptime_hours, thermal_celsius, load_percent, retain_days_remaining, storage_used_tb, storage_node_label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        telemetry.signal_percent,
        0,
        telemetry.uptime_hours,
        telemetry.thermal_celsius,
        telemetry.load_percent,
        telemetry.retain_days_remaining,
        telemetry.storage_used_tb,
        telemetry.storage_node_label,
      ]
    );

    return res.status(201).json({ success: true, id: result.insertId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const discoverCameras = async (_req: AuthRequest, res: Response) => {
  try {
    const startedAt = Date.now();
    const [rows]: any = await db.execute("SELECT ip_simulated FROM cameras");
    const existingIps = new Set<string>();
    const subnetPrefixes = new Set<string>(["192.168.1", "192.168.11"]);
    const candidateOctets = new Set<number>([2, 3, 4, 5, 10, 11, 20, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110]);

    for (const row of rows) {
      const value = String(row.ip_simulated || "");
      existingIps.add(value);
      const match = value.match(/https?:\/\/(\d+\.\d+\.\d+)\.(\d+)/i);
      if (match) {
        subnetPrefixes.add(match[1]);
        const octet = Number(match[2]);
        for (let i = Math.max(2, octet - 5); i <= Math.min(254, octet + 5); i += 1) {
          candidateOctets.add(i);
        }
      }
    }

    const candidates: string[] = [];
    subnetPrefixes.forEach((prefix) => {
      for (const i of candidateOctets) {
        candidates.push(`http://${prefix}.${i}:8080/video`);
      }
    });

    const checks = await Promise.all(
      candidates.map(async (url) => {
        if (existingIps.has(url)) return null;
        try {
          let response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(700) });
          if (response.status === 405 || response.status === 404) {
            response = await fetch(url, { signal: AbortSignal.timeout(900) });
          }
          if (response.status < 500) {
            const suffix = url.match(/(\d+):8080\/video$/)?.[1] || "X";
            return {
              name: `NODE_${suffix}`,
              ip_simulated: url,
              zone: "Auto-Detected",
            };
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const found = checks.filter(Boolean);
    return res.json({
      cameras: found,
      scanned: candidates.length,
      found: found.length,
      duration_ms: Date.now() - startedAt,
      subnets: Array.from(subnetPrefixes),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const blockCamera = (io: Server) => async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { blocked } = req.body;
  try {
    await db.execute("UPDATE cameras SET is_blocked = ? WHERE id = ?", [blocked ? 1 : 0, id]);
    await db.execute(
      "INSERT INTO access_logs (user_id, camera_id, action) VALUES (?, ?, ?)",
      [req.user?.id, id, blocked ? "block" : "unblock"]
    );

    io.emit("camera_update", { id, is_blocked: !!blocked });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCamera = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, ip_simulated, zone } = req.body || {};
  if (!name || !ip_simulated || !zone) {
    return res.status(400).json({ error: "name, ip_simulated and zone are required" });
  }
  if (!String(ip_simulated).toLowerCase().startsWith("http")) {
    return res.status(400).json({ error: "ip_simulated must start with http" });
  }

  const normalizedZone = String(zone).trim().toLowerCase();
  const zoneMap: Record<string, "Gate" | "Factory" | "Warehouse" | "Office"> = {
    gate: "Gate",
    factory: "Factory",
    warehouse: "Warehouse",
    office: "Office",
    "auto-detected": "Gate",
  };
  if (!zoneMap[normalizedZone]) {
    return res.status(400).json({ error: "zone must be one of: Gate, Factory, Warehouse, Office" });
  }

  try {
    const [existsRows]: any = await db.execute(
      "SELECT id FROM cameras WHERE (name = ? OR ip_simulated = ?) AND id <> ? LIMIT 1",
      [name, ip_simulated, id]
    );
    if (existsRows.length) {
      return res.status(409).json({ error: "Camera name or IP/URL already exists" });
    }

    await db.execute(
      "UPDATE cameras SET name = ?, ip_simulated = ?, zone = ? WHERE id = ?",
      [name, ip_simulated, zoneMap[normalizedZone], id]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteCamera = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM cameras WHERE id = ?", [id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const restartCamera = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute(
      `UPDATE camera_telemetry
       SET uptime_seconds = 0, uptime_hours = 0, signal_percent = ?, thermal_celsius = ?, load_percent = ?, updated_at = CURRENT_TIMESTAMP
       WHERE camera_id = ?`,
      [randInt(60, 80), randFloat(35, 45, 2), randInt(10, 30), id]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const captureCameraFrame = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const [rows]: any = await db.execute(
      "SELECT id, name, ip_simulated FROM cameras WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Camera not found" });
    }

    const camera = rows[0];
    const streamUrl = String(camera.ip_simulated || "");
    const snapshotUrl = /\/video$/i.test(streamUrl)
      ? streamUrl.replace(/\/video$/i, "/shot.jpg")
      : streamUrl;

    const response = await fetch(snapshotUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return res.status(502).json({ error: `Snapshot request failed (${response.status})` });
    }

    const contentType = response.headers.get("content-type") || "";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = Buffer.from(await response.arrayBuffer());

    const screenshotsDir = path.resolve(process.cwd(), "cam_screens");
    await fs.mkdir(screenshotsDir, { recursive: true });

    const safeName = String(camera.name).replace(/[^a-z0-9-_]+/gi, "_");
    const fileName = `${safeName}_${camera.id}_${Date.now()}.${ext}`;
    const fullPath = path.join(screenshotsDir, fileName);
    await fs.writeFile(fullPath, bytes);

    return res.json({
      success: true,
      file_name: fileName,
      file_path: fullPath,
      public_path: `/cam_screens/${fileName}`,
      source_url: snapshotUrl
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const runVectorAnalysis = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const [rows]: any = await db.execute(
      `SELECT c.id, c.name, c.status, c.is_blocked, ct.signal_percent, ct.load_percent, ct.thermal_celsius
       FROM cameras c
       LEFT JOIN camera_telemetry ct ON ct.camera_id = c.id
       WHERE c.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Camera not found" });
    }

    const cam = rows[0];
    const signal = Number(cam.signal_percent ?? 0);
    const load = Number(cam.load_percent ?? 0);
    const thermal = Number(cam.thermal_celsius ?? 0);

    let riskScore = 10;
    if (cam.status !== "online") riskScore += 40;
    if (cam.is_blocked) riskScore += 20;
    if (signal > 0 && signal < 60) riskScore += 20;
    if (load > 85) riskScore += 15;
    if (thermal > 70) riskScore += 15;
    riskScore = Math.min(100, riskScore);

    const severity = riskScore >= 75 ? "high" : riskScore >= 45 ? "medium" : "low";
    const summary = severity === "high"
      ? "Vector instability detected. Immediate operator review recommended."
      : severity === "medium"
        ? "Minor vector deviations detected. Monitor this node closely."
        : "Vector profile stable. No immediate anomalies detected.";

    return res.json({
      success: true,
      camera_id: cam.id,
      camera_name: cam.name,
      risk_score: riskScore,
      severity,
      summary,
      inputs: {
        status: cam.status,
        is_blocked: !!cam.is_blocked,
        signal_percent: cam.signal_percent,
        load_percent: cam.load_percent,
        thermal_celsius: cam.thermal_celsius
      },
      analyzed_at: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const proxyCameraStream = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const forceVideo = String(req.query.forceVideo || "") === "1";

  try {
    const [rows]: any = await db.execute(
      "SELECT id, ip_simulated FROM cameras WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Camera not found" });
    }

    const upstreamUrl = normalizeStreamUrl(String(rows[0].ip_simulated || ""), forceVideo);
    if (!upstreamUrl) {
      return res.status(400).json({ error: "Camera stream URL is empty" });
    }

    const upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(15000) });
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: `Upstream stream failed (${upstream.status})` });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Connection", "keep-alive");

    Readable.fromWeb(upstream.body as any).pipe(res);
    return;
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
