import { db } from "../config/db";
import { Server } from "socket.io";

export interface DetectionPayload {
  camera_id: number;
  person_detected: boolean;
  person_count: number;
  face_detected: boolean;
  alert_level: "none" | "medium" | "high";
  detected_at: string;
}

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const deriveDetectionFromFrame = (bytes: Uint8Array) => {
  if (!bytes?.length) {
    return { person_detected: false, person_count: 0, face_detected: false };
  }

  let checksum = 0;
  const stride = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += stride) {
    checksum = (checksum + bytes[i] * ((i % 17) + 1)) % 1000003;
  }

  const motionScore = (checksum % 100) / 100;
  const confidenceBias = ((checksum >> 3) % 100) / 100;

  const person_detected = motionScore > 0.32;
  const maxPeople = confidenceBias > 0.9 ? 5 : confidenceBias > 0.75 ? 4 : 3;
  const person_count = person_detected ? Math.max(1, Math.min(maxPeople, Math.round(motionScore * maxPeople + 0.2))) : 0;
  const face_detected = person_detected && ((checksum % 10) > 4 || person_count === 1);

  return { person_detected, person_count, face_detected };
};

const getSnapshotUrl = (streamUrl: string) => {
  const value = String(streamUrl || "").trim();
  if (!value) return "";
  if (/\/video$/i.test(value)) return value.replace(/\/video$/i, "/shot.jpg");
  return value;
};

const fetchFrame = async (snapshotUrl: string): Promise<Uint8Array | null> => {
  try {
    const res = await fetch(snapshotUrl, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const arr = new Uint8Array(await res.arrayBuffer());
    return arr;
  } catch {
    return null;
  }
};

const persistDetection = async (payload: DetectionPayload, previous?: Partial<DetectionPayload>) => {
  const [updateResult]: any = await db.execute(
    `UPDATE camera_ai_detections
      SET person_detected = ?, person_count = ?, face_detected = ?, alert_level = ?, last_analyzed_at = CURRENT_TIMESTAMP
      WHERE camera_id = ?`,
    [
      payload.person_detected ? 1 : 0,
      payload.person_count,
      payload.face_detected ? 1 : 0,
      payload.alert_level,
      payload.camera_id,
    ]
  );

  if (!updateResult?.affectedRows) {
    await db.execute(
      `INSERT INTO camera_ai_detections
      (camera_id, person_detected, person_count, face_detected, alert_level, last_analyzed_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        payload.camera_id,
        payload.person_detected ? 1 : 0,
        payload.person_count,
        payload.face_detected ? 1 : 0,
        payload.alert_level,
      ]
    );
  }

  const changed = !previous
    || previous.person_detected !== payload.person_detected
    || previous.person_count !== payload.person_count
    || previous.face_detected !== payload.face_detected
    || previous.alert_level !== payload.alert_level;

  if (changed) {
    await db.execute(
      `INSERT INTO camera_ai_detection_events
      (camera_id, person_detected, person_count, face_detected, alert_level, detected_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        payload.camera_id,
        payload.person_detected ? 1 : 0,
        payload.person_count,
        payload.face_detected ? 1 : 0,
        payload.alert_level,
      ]
    );
  }

  return changed;
};

export const runCameraDetection = async (camera: any): Promise<DetectionPayload> => {
  const snapshotUrl = getSnapshotUrl(camera.ip_simulated);
  const frame = snapshotUrl ? await fetchFrame(snapshotUrl) : null;

  let detection = frame ? deriveDetectionFromFrame(frame) : {
    person_detected: Math.random() > 0.65,
    person_count: 0,
    face_detected: false,
  };

  if (!frame && detection.person_detected) {
    detection.person_count = randInt(1, 3);
    detection.face_detected = Math.random() > 0.45;
  }

  if (camera.is_blocked || camera.status !== "online") {
    detection = { person_detected: false, person_count: 0, face_detected: false };
  }

  const alert_level: DetectionPayload["alert_level"] = !detection.person_detected
    ? "none"
    : detection.person_count >= 2
      ? "high"
      : "medium";

  return {
    camera_id: Number(camera.id),
    person_detected: detection.person_detected,
    person_count: detection.person_count,
    face_detected: detection.face_detected,
    alert_level,
    detected_at: new Date().toISOString(),
  };
};

export const startAiVisionSimulation = (io: Server) => {
  const minMs = Number(process.env.AI_DETECTION_MIN_MS || 1000);
  const maxMs = Number(process.env.AI_DETECTION_MAX_MS || 3000);

  const schedule = () => {
    const delay = randInt(Math.min(minMs, maxMs), Math.max(minMs, maxMs));
    setTimeout(runCycle, delay);
  };

  const runCycle = async () => {
    try {
      const [cameras]: any = await db.execute(
        `SELECT c.id, c.ip_simulated, c.status, c.is_blocked,
                ad.person_detected, ad.person_count, ad.face_detected, ad.alert_level
         FROM cameras c
         LEFT JOIN camera_ai_detections ad ON ad.camera_id = c.id`
      );

      const tasks = (cameras || []).map(async (camera: any) => {
        const payload = await runCameraDetection(camera);
        const changed = await persistDetection(payload, {
          person_detected: !!camera.person_detected,
          person_count: Number(camera.person_count || 0),
          face_detected: !!camera.face_detected,
          alert_level: camera.alert_level || "none",
        });

        io.emit("camera_ai_detection_update", payload);

        if (changed && payload.person_detected && payload.person_count >= 2) {
          const [result]: any = await db.execute(
            "INSERT INTO alerts (type, severity, description, camera_id) VALUES (?, ?, ?, ?)",
            ["anomaly", "medium", `Multiple human presence detected on camera ${camera.id} (count: ${payload.person_count})`, camera.id]
          );
          io.emit("new_alert", {
            id: result.insertId,
            type: "anomaly",
            severity: "medium",
            description: `Multiple human presence detected on camera ${camera.id} (count: ${payload.person_count})`,
            timestamp: new Date().toISOString(),
            is_acknowledged: false,
          });
        }
      });

      await Promise.allSettled(tasks);
    } catch {
      // keep ai vision simulation fault tolerant
    } finally {
      schedule();
    }
  };

  schedule();
};
