import rateLimit from 'express-rate-limit';
import config from '../config/env';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.', code: 'TOO_MANY_REQUESTS' },
});

export const authLimiter = rateLimit({
  windowMs: config.rateLimit.loginWindowMs,
  max: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again in 1 minute.', code: 'AUTH_RATE_LIMIT' },
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many OTP requests. Please wait 60 seconds.', code: 'OTP_RATE_LIMIT' },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Search rate limit exceeded.', code: 'SEARCH_RATE_LIMIT' },
});
