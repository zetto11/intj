import { Router } from 'express';
import { createCamera, getCameras, updateCamera } from '../controllers/camerasController.js';
import { validate, validateCameraStatus } from '../middleware/validate.js';

const router = Router();

router.get('/', getCameras);
router.post('/', validate(['name', 'zone', 'ip_simulated']), createCamera);
router.put('/:id', validateCameraStatus, updateCamera);

export default router;
