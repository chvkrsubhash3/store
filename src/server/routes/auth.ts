import { Router } from 'express';
import { register, login, logout, refreshToken, verifyEmail, forgotPassword, resetPassword, sendOTP, verifyOTP, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refreshToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/send-otp', otpLimiter, sendOTP);
router.post('/verify-otp', authLimiter, verifyOTP);
router.get('/me', authenticate, getMe);
export default router;
