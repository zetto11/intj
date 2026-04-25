import { query } from '../config/db.js';

const statuses = ['online', 'offline', 'maintenance'];

export function startSimulation() {
  const intervalMs = Number(process.env.SIMULATION_INTERVAL_MS || 15000);

  setInterval(async () => {
    try {
      const cameras = await query('SELECT id, status, is_blocked FROM cameras');
      if (!Array.isArray(cameras) || cameras.length === 0) {
        return;
      }

      const randomCamera = cameras[Math.floor(Math.random() * cameras.length)];
      if (!randomCamera || randomCamera.is_blocked) {
        return;
      }

      const nextStatus = statuses[Math.floor(Math.random() * statuses.length)];

      await query('UPDATE cameras SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [nextStatus, randomCamera.id]);
      await query('INSERT INTO access_logs (user_id, camera_id, action, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', [1, randomCamera.id, `SIM_STATUS_${nextStatus.toUpperCase()}`]);

      if (nextStatus === 'offline') {
        await query(
          'INSERT INTO alerts (type, severity, description, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          ['CAMERA_OFFLINE', 'high', `Camera ${randomCamera.id} is now offline (simulated).`],
        );
      }
    } catch (error) {
      console.error('Simulation error:', error.message);
    }
  }, intervalMs);
}
