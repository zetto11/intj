import { Router } from 'express';
import { createUser, getUsers } from '../controllers/usersController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', getUsers);
router.post('/', validate(['username', 'password']), createUser);

export default router;
