import { db } from "../config/db";
import { Server } from "socket.io";

export interface DetectionPayload {
  camera_id: number;
  person_detected: boolean;
  person_count: number;
  face_detected: boolean;
  alert_level: "none" | "medium" | "high";
  person_track: TrackingTarget | null;
  face_track: TrackingTarget | null;
  person_tracks: TrackingTarget[];
  face_tracks: TrackingTarget[];
  detected_at: string;
}

export interface TrackingTarget {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface NormalizedBox {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  label: string;
}

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const trackState = new Map<number, { people: TrackingTarget[]; faces: TrackingTarget[] }>();
let missingDetectorWarningPrinted = false;

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

const normalizeCandidate = (candidate: any): NormalizedBox | null => {
  if (!candidate || typeof candidate !== "object") return null;

  const left = Number(candidate.left ?? candidate.xmin ?? candidate.x1 ?? candidate.x ?? candidate.bbox?.[0]);
  const top = Number(candidate.top ?? candidate.ymin ?? candidate.y1 ?? candidate.y ?? candidate.bbox?.[1]);
  const width = Number(candidate.width ?? candidate.w ?? candidate.xmax - candidate.xmin ?? candidate.x2 - candidate.x1 ?? candidate.bbox?.[2]);
  const height = Number(candidate.height ?? candidate.h ?? candidate.ymax - candidate.ymin ?? candidate.y2 - candidate.y1 ?? candidate.bbox?.[3]);

  if (![left, top, width, height].every(Number.isFinite)) return null;

  let x = left;
  let y = top;
  let w = width;
  let h = height;

  const sourceW = Number(candidate.image_width ?? candidate.frame_width ?? candidate.source_width ?? candidate.width_px);
  const sourceH = Number(candidate.image_height ?? candidate.frame_height ?? candidate.source_height ?? candidate.height_px);
  const looksPixelBased = [x, y, w, h].some((n) => n > 1);
  if (looksPixelBased && Number.isFinite(sourceW) && Number.isFinite(sourceH) && sourceW > 0 && sourceH > 0) {
    x = x / sourceW;
    y = y / sourceH;
    w = w / sourceW;
    h = h / sourceH;
  }

  const normalized = {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    w: clamp(w, 0.02, 1),
    h: clamp(h, 0.02, 1),
    confidence: clamp(Number(candidate.confidence ?? candidate.score ?? 0.8), 0, 1),
    label: String(candidate.class ?? candidate.label ?? candidate.name ?? "unknown").toLowerCase(),
  };

  if ([normalized.x, normalized.y, normalized.w, normalized.h].some((n) => !Number.isFinite(n))) return null;
  if (normalized.w <= 0.02 || normalized.h <= 0.02) return null;
  if (normalized.x >= 1 || normalized.y >= 1) return null;

  return normalized;
};

const parseDetectorResponse = (json: any): NormalizedBox[] => {
  const candidates = json?.predictions || json?.detections || json?.results || json?.objects || [];
  if (!Array.isArray(candidates)) return [];
  return candidates.map(normalizeCandidate).filter(Boolean) as NormalizedBox[];
};

const callDetectionApi = async (url: string, frame: Uint8Array): Promise<NormalizedBox[]> => {
  if (!url) return [];
  try {
    const blob = new Blob([frame], { type: "image/jpeg" });
    const form = new FormData();
    form.append("image", blob, "frame.jpg");

    const res = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return [];
    const json = await res.json();
    return parseDetectorResponse(json);
  } catch {
    return [];
  }
};

const smoothTarget = (prev: TrackingTarget | null, next: TrackingTarget): TrackingTarget => {
  if (!prev) return next;
  return {
    id: next.id,
    x: clamp((prev.x * 0.55) + (next.x * 0.45), 0.01, 0.95),
    y: clamp((prev.y * 0.55) + (next.y * 0.45), 0.01, 0.95),
    w: clamp((prev.w * 0.6) + (next.w * 0.4), 0.03, 0.9),
    h: clamp((prev.h * 0.6) + (next.h * 0.4), 0.03, 0.9),
  };
};

const sortTracks = (tracks: TrackingTarget[]) => [...tracks].sort((a, b) => a.x - b.x);

const tracksFromBoxes = (boxes: NormalizedBox[], previous: TrackingTarget[] | undefined): TrackingTarget[] => {
  const sortedBoxes = [...boxes].sort((a, b) => a.x - b.x);
  const prevSorted = sortTracks(previous || []);

  return sortedBoxes.map((box, idx) => {
    const raw: TrackingTarget = {
      id: idx,
      x: clamp(box.x, 0, 0.98),
      y: clamp(box.y, 0, 0.98),
      w: clamp(box.w, 0.03, 0.9),
      h: clamp(box.h, 0.03, 0.9),
    };
    return smoothTarget(prevSorted[idx] || null, raw);
  });
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

const buildPayloadFromDetections = (
  camera: any,
  personDetections: NormalizedBox[],
  faceDetections: NormalizedBox[]
): DetectionPayload => {
  const previous = trackState.get(Number(camera.id));
  const people = tracksFromBoxes(personDetections, previous?.people);
  const faces = tracksFromBoxes(faceDetections, previous?.faces);

  if (people.length || faces.length) {
    trackState.set(Number(camera.id), { people, faces });
  } else {
    trackState.delete(Number(camera.id));
  }

  const personCount = people.length;
  const personDetected = personCount > 0;
  const faceDetected = faces.length > 0;
  const alert_level: DetectionPayload["alert_level"] = !personDetected
    ? "none"
    : personCount >= 2
      ? "high"
      : "medium";

  return {
    camera_id: Number(camera.id),
    person_detected: personDetected,
    person_count: personCount,
    face_detected: faceDetected,
    alert_level,
    person_track: people[0] || null,
    face_track: faces[0] || null,
    person_tracks: people,
    face_tracks: faces,
    detected_at: new Date().toISOString(),
  };
};

export const runCameraDetection = async (camera: any): Promise<DetectionPayload> => {
  if (camera.is_blocked || camera.status !== "online") {
    trackState.delete(Number(camera.id));
    return {
      camera_id: Number(camera.id),
      person_detected: false,
      person_count: 0,
      face_detected: false,
      alert_level: "none",
      person_track: null,
      face_track: null,
      person_tracks: [],
      face_tracks: [],
      detected_at: new Date().toISOString(),
    };
  }

  const snapshotUrl = getSnapshotUrl(camera.ip_simulated);
  const frame = snapshotUrl ? await fetchFrame(snapshotUrl) : null;
  if (!frame) {
    trackState.delete(Number(camera.id));
    return {
      camera_id: Number(camera.id),
      person_detected: false,
      person_count: 0,
      face_detected: false,
      alert_level: "none",
      person_track: null,
      face_track: null,
      person_tracks: [],
      face_tracks: [],
      detected_at: new Date().toISOString(),
    };
  }

  const personApi = String(process.env.AI_PERSON_DETECTOR_URL || "").trim();
  const faceApi = String(process.env.AI_FACE_DETECTOR_URL || personApi).trim();

  if (!personApi && !missingDetectorWarningPrinted) {
    missingDetectorWarningPrinted = true;
    console.warn("[AI] No detector URL configured. Set AI_PERSON_DETECTOR_URL (and optionally AI_FACE_DETECTOR_URL) to enable real detection.");
  }

  const [personCandidates, faceCandidates] = await Promise.all([
    callDetectionApi(personApi, frame),
    callDetectionApi(faceApi, frame),
  ]);

  const personDetections = personCandidates.filter((p) => ["person", "human", "body"].includes(p.label));
  const faceDetections = faceCandidates.filter((f) => ["face", "person_face", "head"].includes(f.label));

  return buildPayloadFromDetections(camera, personDetections, faceDetections);
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
