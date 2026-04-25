export interface Camera {
  id: number;
  name: string;
  zone: string;
  ip_simulated: string;
  status: 'online' | 'offline' | 'maintenance';
  is_blocked: boolean;
  last_seen: string;
  signal_percent?: number | null;
  uptime_seconds?: number | null;
  uptime_hours?: number | null;
  thermal_celsius?: number | null;
  load_percent?: number | null;
  retain_days_remaining?: number | null;
  storage_used_tb?: number | null;
  storage_node_label?: string | null;
  telemetry_updated_at?: string | null;
  person_detected?: boolean | null;
  person_count?: number | null;
  face_detected?: boolean | null;
  alert_level?: 'none' | 'medium' | 'high' | null;
  last_analyzed_at?: string | null;
  person_track?: CameraTrack | null;
  face_track?: CameraTrack | null;
  person_tracks?: CameraTrack[] | null;
  face_tracks?: CameraTrack[] | null;
  lat?: number;
  lng?: number;
}

export interface CameraTrack {
  id?: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AccessPoint {
  id: number;
  name: string;
  status: 'online' | 'offline';
  lat: number;
  lng: number;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface Alert {
  id: number;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  explanation?: string;
  affected_entity?: string;
  is_acknowledged: boolean;
  timestamp: string;
}

export interface AccessLog {
  id: number;
  user_id: number;
  username?: string;
  camera_id: number;
  camera_name?: string;
  action: string;
  timestamp: string;
}
