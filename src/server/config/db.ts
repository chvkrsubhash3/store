import { Pool } from 'pg';
import config from './env';

const isSupabaseCloud = config.supabase.dbUrl.includes('supabase.co') || config.supabase.dbUrl.includes('supabase.com') || config.supabase.dbUrl.includes('pooler.supabase.com');

const pool = new Pool({
  connectionString: config.supabase.dbUrl,
  ssl: isSupabaseCloud || config.env === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[Database Pool Error]', err.message);
});

export const query = async (text: string, params?: any[]) => {
  try {
    return await pool.query(text, params);
  } catch (err: any) {
    console.error(`[DB Query Error] ${err.message}`);
    throw err;
  }
};

export const connectDB = async () => {
  if (!config.supabase.dbUrl || config.supabase.dbUrl.includes('[YOUR-PASSWORD]')) {
    console.warn('⚠️  PostgreSQL connection pending configuration in .env');
    return false;
  }
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL / Supabase DB Connected:', res.rows[0].now);
    return true;
  } catch (error: any) {
    console.warn('⚠️  PostgreSQL connection warning:', error.message);
    return false;
  }
};

export default pool;
