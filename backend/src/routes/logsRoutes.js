import { Router } from 'express';
import { createLog, getLogs } from '../controllers/logsController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', getLogs);
router.post('/', validate(['user_id', 'camera_id', 'action']), createLog);

export default router;
