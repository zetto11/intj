import { Router } from 'express';
import { createAlert, getAlerts } from '../controllers/alertsController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', getAlerts);
router.post('/', validate(['type', 'severity', 'description']), createAlert);

export default router;
