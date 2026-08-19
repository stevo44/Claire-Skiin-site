import { Router } from 'express';
import { 
  register, 
  login, 
  getProfile, 
  refresh, 
  logout, 
  forgotPassword, 
  resetPassword, 
  verifyEmail,
  updateProfile
} from '../controllers/auth.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { validate, authSchemas } from '../middleware/validation.middleware.ts';

const router = Router();

router.post('/register', validate(authSchemas.register), register);
router.post('/login', validate(authSchemas.login), login);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', validate(authSchemas.forgotPassword), forgotPassword);
router.post('/reset-password', validate(authSchemas.resetPassword), resetPassword);
router.get('/verify-email', verifyEmail);

export { router as authRouter };

