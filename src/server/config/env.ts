import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    dbUrl: process.env.DATABASE_URL || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'securemart_super_secret_jwt_key_32bytes!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'securemart_super_secret_refresh_key_32bytes!',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    loginMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10),
    loginWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '60000', 10),
  },

  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
};

export default config;
