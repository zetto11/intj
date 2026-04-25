import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/usersRoutes.js';
import camerasRoutes from './routes/camerasRoutes.js';
import logsRoutes from './routes/logsRoutes.js';
import alertsRoutes from './routes/alertsRoutes.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/users', usersRoutes);
app.use('/cameras', camerasRoutes);
app.use('/logs', logsRoutes);
app.use('/alerts', alertsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error', detail: err.message });
});

export default app;
