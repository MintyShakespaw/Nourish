import { Router } from 'express';
import { validate } from '../middleware/validate.middleware.js';
import { RegisterSchema } from './schemas.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();
router.post('/register', validate(RegisterSchema), authController.register);
export default router;
