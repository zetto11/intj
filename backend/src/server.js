import app from './app.js';
import { pool } from './config/db.js';
import { startSimulation } from './services/simulationService.js';

const PORT = Number(process.env.PORT || 4000);

async function bootstrap() {
  try {
    await pool.getConnection();
    console.log('Connected to MySQL database cctv_cam_db');

    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });

    startSimulation();
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  }
}

bootstrap();
