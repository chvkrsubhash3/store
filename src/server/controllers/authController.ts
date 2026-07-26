import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/env';
import { query } from '../config/db';

const generateTokens = (user: { id: string; email: string; role: string }) => {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn as any }
  );
  const refreshToken = jwt.sign(
    { sub: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  );
  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, phone, role = 'customer' } = req.body;
  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ success: false, message: 'Required fields missing' }); return;
  }

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Email address already registered' }); return;
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const userId = uuidv4();
    const verificationToken = uuidv4();

    const allowedRoles = ['customer', 'seller', 'delivery', 'pharmacy_manager'];
    const assignedRole = allowedRoles.includes(role) ? role : 'customer';

    const result = await query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, email_verification_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, role, first_name, last_name, created_at
    `, [userId, email.toLowerCase(), passwordHash, firstName, lastName, phone || null, assignedRole, verificationToken]);

    const newUser = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(newUser);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user: newUser, accessToken, refreshToken },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password required' }); return;
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const result = await query(
      'SELECT id, email, password_hash, role, first_name, last_name, is_active, is_banned, failed_login_attempts, lock_until FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid email or password' }); return;
    }

    const user = result.rows[0];

    if (user.is_banned) {
      res.status(403).json({ success: false, message: 'Account has been banned. Contact security support.' }); return;
    }

    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      res.status(429).json({ success: false, message: 'Account locked due to multiple failed login attempts. Try again later.' }); return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await query('UPDATE users SET failed_login_attempts = $1, lock_until = $2 WHERE id = $3', [attempts, lockUntil, user.id]);
      res.status(401).json({ success: false, message: 'Invalid email or password' }); return;
    }

    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    await query(
      'UPDATE users SET failed_login_attempts = 0, lock_until = NULL, last_login = NOW(), last_ip = $1 WHERE id = $2',
      [rawIp, user.id]
    );

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: config.env === 'production', maxAge: 15 * 60 * 1000 });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
        accessToken, refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie('accessToken');
  res.json({ success: true, message: 'Logged out successfully' });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) { res.status(400).json({ success: false, message: 'Refresh token required' }); return; }

  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;
    const result = await query('SELECT id, email, role, first_name, last_name FROM users WHERE id = $1', [decoded.sub]);
    if (!result.rows.length) { res.status(401).json({ success: false, message: 'User not found' }); return; }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(result.rows[0]);
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  try {
    const result = await query('UPDATE users SET is_email_verified = true, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id', [token]);
    if (!result.rows.length) { res.status(400).json({ success: false, message: 'Invalid verification token' }); return; }
    res.json({ success: true, message: 'Email verified successfully!' });
  } catch { res.status(500).json({ success: false, message: 'Verification failed' }); }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  try {
    const resetToken = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await query('UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3', [resetToken, expiry, email?.toLowerCase()]);
    res.json({ success: true, message: 'Password reset token generated (Check console/logs in lab)', data: { resetToken } });
  } catch { res.status(500).json({ success: false, message: 'Password reset failed' }); }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;
  try {
    const userResult = await query('SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()', [token]);
    if (!userResult.rows.length) { res.status(400).json({ success: false, message: 'Invalid or expired token' }); return; }
    const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await query('UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2', [hash, userResult.rows[0].id]);
    res.json({ success: true, message: 'Password reset successful' });
  } catch { res.status(500).json({ success: false, message: 'Reset failed' }); }
};

export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  res.json({ success: true, message: 'OTP sent (Simulated)', data: { otp } });
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  const { otp } = req.body;
  res.json({ success: true, message: 'OTP verified successfully' });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  res.json({ success: true, data: user });
};
